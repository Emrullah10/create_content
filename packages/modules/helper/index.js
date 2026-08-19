export const baseHandler = (handleErrors) => async (req, res, next, callerName, fn) => {
  try {
    const result = await fn(req);
    res.json(result);
  } catch (err) {
    handleErrors(res, err, callerName);
  }
};

export const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
