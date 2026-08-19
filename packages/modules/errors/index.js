const STATUS_BY_CODE = {
  DUPLICATE_TOPIC:         409,
  QUALITY_BELOW_THRESHOLD: 422,
  PUBLISH_FAILED:          502,
  MEDIUM_TOKEN_MISSING:    424,
  DIAGRAM_RENDER_FAILED:   422,
  ASSET_UPLOAD_FAILED:     502,
  NOT_FOUND:               404,
};

const handleErrors = (res, err, callerName) => {
  console.error(`[${callerName}]`, err.message);

  if (err.code === '23505') {
    return res.status(409).json({ code: 'error', message: err.detail ?? 'Duplicate key' });
  }

  const status = STATUS_BY_CODE[err.code] ?? 500;
  return res.status(status).json({ code: err.code ?? 'error', message: err.message });
};

export default handleErrors;
export { handleErrors };
