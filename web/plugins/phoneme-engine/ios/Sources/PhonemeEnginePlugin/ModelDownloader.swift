import CryptoKit
import Foundation

/// Downloads the model once into Application Support/models, verifies SHA-256 and keeps it out of
/// iCloud backup (App Store 4.2.3(ii): the app asks first and shows the size; see the web side).
final class ModelDownloader: NSObject, URLSessionDownloadDelegate {
    typealias Progress = (_ received: Int64, _ expected: Int64) -> Void
    typealias Completion = (Result<URL, Error>) -> Void

    private var progress: Progress?
    private var completion: Completion?
    private var destination: URL?
    private var expectedSHA256: String?
    private var task: URLSessionDownloadTask?
    private lazy var session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)

    static func modelsDirectory() throws -> URL {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var folder = base.appendingPathComponent("models", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try folder.setResourceValues(values)
        return folder
    }

    static func sha256(of url: URL) throws -> String {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        var hasher = SHA256()
        while let chunk = try handle.read(upToCount: 1 << 20), !chunk.isEmpty { hasher.update(data: chunk) }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
    }

    func start(from url: URL, headers: [String: String], to destination: URL, sha256: String?,
               progress: @escaping Progress, completion: @escaping Completion) {
        self.progress = progress
        self.completion = completion
        self.destination = destination
        self.expectedSHA256 = sha256?.lowercased()
        var request = URLRequest(url: url)
        // The pairing token: a learner's own server answers 401 without it, like any API call.
        headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        task = session.downloadTask(with: request)
        task?.resume()
    }

    func cancel() { task?.cancel() }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64,
                    totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        progress?(totalBytesWritten, totalBytesExpectedToWrite)
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let destination else { return }
        do {
            if let status = (downloadTask.response as? HTTPURLResponse)?.statusCode, status != 200 {
                throw DownloadError.http(status)
            }
            if let expected = expectedSHA256 {
                let actual = try ModelDownloader.sha256(of: location)
                guard actual == expected else { throw DownloadError.checksum }
            }
            if FileManager.default.fileExists(atPath: destination.path) {
                try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.moveItem(at: location, to: destination)
            finish(.success(destination))
        } catch {
            finish(.failure(error))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error { finish(.failure(error)) }
    }

    private func finish(_ result: Result<URL, Error>) {
        let done = completion
        completion = nil
        progress = nil
        done?(result)
    }

    enum DownloadError: LocalizedError {
        case http(Int)
        case checksum

        var errorDescription: String? {
            switch self {
            case .http(let status): return "download failed with HTTP \(status)"
            case .checksum: return "downloaded model failed its SHA-256 check"
            }
        }
    }
}
