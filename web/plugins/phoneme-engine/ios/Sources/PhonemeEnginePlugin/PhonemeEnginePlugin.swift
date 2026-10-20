import Capacitor
import Foundation

/// JS name `PhonemeEngine`. Audio goes in and posteriors come out as base64 Float32 so a 3 s
/// take (150 frames × 392 tokens) crosses the bridge as one ~300 KB string, not a JSON array.
@objc(PhonemeEnginePlugin)
public class PhonemeEnginePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhonemeEnginePlugin"
    public let jsName = "PhonemeEngine"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelDownload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "posteriors", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "benchmark", returnType: CAPPluginReturnPromise)
    ]

    private let queue = DispatchQueue(label: "aec.phoneme-engine", qos: .userInitiated)
    private var engine: PhonemeEngine?
    private var loadedName: String?
    private let downloader = ModelDownloader()

    private func modelURL(_ name: String) throws -> URL {
        let safe = (name as NSString).lastPathComponent
        return try ModelDownloader.modelsDirectory().appendingPathComponent(safe)
    }

    @objc func status(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "w2v.mm8.onnx"
        do {
            let url = try modelURL(name)
            let exists = FileManager.default.fileExists(atPath: url.path)
            let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
            call.resolve([
                "downloaded": exists,
                "bytes": size,
                "loaded": loadedName == name && engine != nil,
                "coreML": engine?.usesCoreML ?? false,
                "physicalMemory": ProcessInfo.processInfo.physicalMemory
            ])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func download(_ call: CAPPluginCall) {
        guard let source = call.getString("url").flatMap(URL.init(string:)),
              let name = call.getString("name") else {
            call.reject("url and name are required")
            return
        }
        do {
            let destination = try modelURL(name)
            var lastEmitted = Date.distantPast
            let headers = (call.getObject("headers") ?? [:]).compactMapValues { $0 as? String }
            downloader.start(from: source, headers: headers, to: destination, sha256: call.getString("sha256"),
                             progress: { [weak self] received, expected in
                let now = Date()
                guard now.timeIntervalSince(lastEmitted) > 0.25 else { return }
                lastEmitted = now
                self?.notifyListeners("downloadProgress", data: ["received": received, "expected": expected])
            }, completion: { result in
                switch result {
                case .success(let url): call.resolve(["path": url.path])
                case .failure(let error): call.reject(error.localizedDescription)
                }
            })
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func cancelDownload(_ call: CAPPluginCall) {
        downloader.cancel()
        call.resolve()
    }

    @objc func load(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "w2v.mm8.onnx"
        let useCoreML = call.getBool("coreML") ?? false
        let threads = call.getInt("threads") ?? 2
        queue.async {
            do {
                let url = try self.modelURL(name)
                let started = CFAbsoluteTimeGetCurrent()
                self.engine = try PhonemeEngine(modelPath: url.path, useCoreML: useCoreML, threads: threads)
                self.loadedName = name
                call.resolve([
                    "milliseconds": (CFAbsoluteTimeGetCurrent() - started) * 1000,
                    "coreML": self.engine?.usesCoreML ?? false
                ])
            } catch {
                self.engine = nil
                call.reject("could not load the model: \(error.localizedDescription)")
            }
        }
    }

    @objc func posteriors(_ call: CAPPluginCall) {
        guard let base64 = call.getString("samples"), let data = Data(base64Encoded: base64) else {
            call.reject("samples (base64 Float32, 16 kHz mono) are required")
            return
        }
        queue.async {
            guard let engine = self.engine else {
                call.reject("model not loaded")
                return
            }
            let samples = data.withUnsafeBytes { Array($0.bindMemory(to: Float.self)) }
            do {
                let result = try engine.posteriors(samples: samples)
                let bytes = result.values.withUnsafeBufferPointer { Data(buffer: $0) }
                call.resolve([
                    "frames": result.frames,
                    "vocab": result.vocab,
                    "data": bytes.base64EncodedString(),
                    "milliseconds": result.milliseconds
                ])
            } catch {
                call.reject("inference failed: \(error.localizedDescription)")
            }
        }
    }

    /// Native-only timing on synthetic audio: how long `seconds` of speech takes, `runs` times.
    @objc func benchmark(_ call: CAPPluginCall) {
        let seconds = call.getDouble("seconds") ?? 3
        let runs = max(1, call.getInt("runs") ?? 5)
        queue.async {
            guard let engine = self.engine else {
                call.reject("model not loaded")
                return
            }
            let count = Int(seconds * 16_000)
            let samples = (0..<count).map { index in Float(sin(Double(index) * 0.05)) * 0.1 }
            do {
                _ = try engine.posteriors(samples: samples)
                var timings: [Double] = []
                for _ in 0..<runs { timings.append(try engine.posteriors(samples: samples).milliseconds) }
                // Read from the device console (`xcrun devicectl … --console`) during the A0 spike.
                print("ENGINE_BENCH seconds=\(seconds) coreML=\(engine.usesCoreML) ms=\(timings.map { Int($0) })")
                call.resolve(["milliseconds": timings, "coreML": engine.usesCoreML])
            } catch {
                call.reject("benchmark failed: \(error.localizedDescription)")
            }
        }
    }
}
