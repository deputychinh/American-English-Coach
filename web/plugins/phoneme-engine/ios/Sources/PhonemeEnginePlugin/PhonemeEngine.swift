import Accelerate
import Foundation
import OnnxRuntimeBindings

/// wav2vec2 CTC posteriors on ONNX Runtime. Mirrors `backend/app/ml/onnx_recognizer.py`:
/// zero-mean unit-variance input, log-softmax output, one frame per 20 ms.
final class PhonemeEngine {
    struct Posteriors {
        let frames: Int
        let vocab: Int
        let values: [Float]
        let milliseconds: Double
    }

    private static let normaliseEpsilon: Float = 1e-7
    private let env: ORTEnv
    private let session: ORTSession
    let usesCoreML: Bool

    init(modelPath: String, useCoreML: Bool, threads: Int) throws {
        env = try ORTEnv(loggingLevel: .warning)
        let options = try ORTSessionOptions()
        try options.setIntraOpNumThreads(Int32(threads))
        try options.setGraphOptimizationLevel(.all)
        var coreML = false
        if useCoreML {
            do {
                let coreMLOptions = ORTCoreMLExecutionProviderOptions()
                try options.appendCoreMLExecutionProvider(with: coreMLOptions)
                coreML = true
            } catch {
                coreML = false
            }
        }
        usesCoreML = coreML
        session = try ORTSession(env: env, modelPath: modelPath, sessionOptions: options)
    }

    func posteriors(samples: [Float]) throws -> Posteriors {
        let started = CFAbsoluteTimeGetCurrent()
        var input = PhonemeEngine.normalise(samples)
        let data = NSMutableData(bytes: &input, length: input.count * MemoryLayout<Float>.stride)
        let value = try ORTValue(tensorData: data, elementType: .float, shape: [1, NSNumber(value: input.count)])
        let outputs = try session.run(withInputs: ["input_values": value], outputNames: ["logits"], runOptions: nil)
        guard let logits = outputs["logits"] else { throw EngineError.noOutput }
        let shape = try logits.tensorTypeAndShapeInfo().shape.map { $0.intValue }
        let raw = try logits.tensorData() as Data
        var values = raw.withUnsafeBytes { Array($0.bindMemory(to: Float.self)) }
        let frames = shape.count == 3 ? shape[1] : 0
        let vocab = shape.count == 3 ? shape[2] : 0
        PhonemeEngine.logSoftmaxRows(&values, rows: frames, columns: vocab)
        let elapsed = (CFAbsoluteTimeGetCurrent() - started) * 1000
        return Posteriors(frames: frames, vocab: vocab, values: values, milliseconds: elapsed)
    }

    static func normalise(_ samples: [Float]) -> [Float] {
        guard !samples.isEmpty else { return samples }
        var mean: Float = 0
        vDSP_meanv(samples, 1, &mean, vDSP_Length(samples.count))
        var centred = [Float](repeating: 0, count: samples.count)
        var negativeMean = -mean
        vDSP_vsadd(samples, 1, &negativeMean, &centred, 1, vDSP_Length(samples.count))
        var meanSquare: Float = 0
        vDSP_measqv(centred, 1, &meanSquare, vDSP_Length(samples.count))
        var scale = 1 / (meanSquare + normaliseEpsilon).squareRoot()
        var out = [Float](repeating: 0, count: samples.count)
        vDSP_vsmul(centred, 1, &scale, &out, 1, vDSP_Length(samples.count))
        return out
    }

    static func logSoftmaxRows(_ values: inout [Float], rows: Int, columns: Int) {
        guard rows > 0, columns > 0 else { return }
        for row in 0..<rows {
            let start = row * columns
            var peak: Float = -.infinity
            for index in start..<(start + columns) where values[index] > peak { peak = values[index] }
            var sum: Float = 0
            for index in start..<(start + columns) { sum += expf(values[index] - peak) }
            let logSum = logf(sum) + peak
            for index in start..<(start + columns) { values[index] -= logSum }
        }
    }

    enum EngineError: Error { case noOutput }
}
