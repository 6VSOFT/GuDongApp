// The SDK currently treats every non-412 conditional write as successful.
// Validate the actual HTTP response before the SDK can report a phantom write.
export function checkedBlobFetch(fetcher = fetch) {
  return async (url, options = {}) => {
    const response = await fetcher(url, options);
    if (options.method?.toLowerCase() === "put" && response.status !== 412) {
      if (!response.ok || !response.headers.get("etag")) {
        console.error(
          "Blob write failed",
          response.status,
          "etag:",
          Boolean(response.headers.get("etag")),
        );
        throw Error("Blob write was not acknowledged");
      }
    }
    return response;
  };
}
