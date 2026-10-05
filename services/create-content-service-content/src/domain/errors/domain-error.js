// (code, message, details). translate-domain-error bu imzaya dayanir: CODE_TO_FACTORY[err.code].
export class DomainError extends Error {
  constructor(code, message, details) {
    super(message || code);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}
export default DomainError;
