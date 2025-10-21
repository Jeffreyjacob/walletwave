export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'error' : 'fail';
    this.isOperational = true;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}
