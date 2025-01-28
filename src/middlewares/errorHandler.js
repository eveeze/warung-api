const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  // Log the error (in production, use a logging service like Winston or Datadog)
  console.error(err);

  // Send generic error message to client in production
  if (process.env.NODE_ENV === "production") {
    return res.status(statusCode).json({ error: "Something went wrong" });
  }

  // Send detailed error message in development
  return res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
