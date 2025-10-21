import { Err, ValidationError } from 'joi';
import getConfig from '../config/config';
import { AppError } from '../utils/appError';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { NextFunction, Request, Response } from 'express';

const config = getConfig();

const handlePrismaKnownError = (
  err: PrismaClientKnownRequestError
): AppError => {
  switch (err.code) {
    case 'P2002':
      const target = err.meta?.target as string[];
      const field = target ? target[0] : 'field';
      return new AppError(
        `Duplicare value for ${field}. Please use another value`,
        400
      );

    case 'P2003':
      return new AppError('Foreign key constraint failed', 400);

    case 'P2025':
      return new AppError('Record not found', 404);

    case 'P2012':
      const missingField = err.meta?.field_name;
      return new AppError(`Missing required field: ${missingField}`, 400);

    case 'P2021':
      return new AppError('Table does not exist in database', 500);

    case 'P2022':
      return new AppError('Column does not exist in database', 500);

    case 'P2023':
      return new AppError('Inconsistent column data', 400);

    case 'P2011':
      const nullField = err.meta?.constraint;
      return new AppError(`Required field cannot be null: ${nullField}`, 400);

    case 'P2006':
      return new AppError('Invalid input value for field', 400);

    case 'P2009':
      return new AppError('Query validation failed', 400);

    case 'P2010':
      return new AppError('Raw query failed to execute', 500);

    case 'P2034':
      return new AppError('Transaction failed due to write conflict', 409);

    default:
      return new AppError(`Datebase error: ${err.message}`, 500);
  }
};

const handlePrismaValidationError = (
  err: PrismaClientValidationError
): AppError => {
  let message = err.message;

  if (message.includes('Argument') && message.includes('is missing')) {
    const field = message.match(/Argument `(\w+)`/)?.[1];
    message = `Missing required field: ${field}`;
  } else if (message.includes('Invalid value')) {
    message = 'Invalid input data provided';
  } else if (message.includes('Unknown field')) {
    const field = message.match(/Unknown field `(\w+)`/)?.[1];
    message = `Unknown field: ${field}`;
  } else {
    message = 'Validation failed: Invalid input data';
  }

  return new AppError(message, 400);
};

const handlePrismaInitError = (
  err: PrismaClientInitializationError
): AppError => {
  if (err.message.includes('ECONNREFUSED')) {
    return new AppError(
      'Database connection failed. Please check database server',
      500
    );
  } else if (err.message.includes('authentication failed')) {
    return new AppError('Database authentication failed', 500);
  } else if (
    err.message.includes('database') &&
    err.message.includes('does not exist')
  ) {
    return new AppError('Database does not exist', 500);
  } else {
    return new AppError('Database initialization failed', 500);
  }
};

const handlePrismaUnknownError = (
  err: PrismaClientUnknownRequestError
): AppError => {
  return new AppError('An unknown database error occured', 500);
};

const handlePrismaRustPanicError = (
  err: PrismaClientRustPanicError
): AppError => {
  return new AppError('Internal database engine error', 500);
};

const handleJoiValidationError = (err: ValidationError): AppError => {
  const errors = err.details.map((detail) => detail.message).join(', ');
  return new AppError(`Validation failed: ${errors}`, 400);
};

const handleJwtError = (): AppError => {
  return new AppError('Invalid token please login again', 401);
};

const handleJWtExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please login again', 401);
};

const sendErrorDev = (err: AppError | Error, res: Response): void => {
  const statusCode = (err as AppError).statusCode || 500;
  console.error('Error Details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...((err as any).meta && { meta: (err as any).meta }),
    ...((err as any).code && { code: (err as any).code }),
  });

  res.status(statusCode).json({
    status: (err as AppError).status || 'error',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      data: (err as AppError).data || null,
      ...((err as any).meta && { meta: (err as any).meta }),
      ...((err as any).code && { code: (err as any).code }),
    },
  });
};

const sendErrorProd = (err: AppError | Error, res: Response): void => {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      data: (err as AppError).data || null,
    });
  } else {
    console.error('Error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      data: (err as AppError).data || null,
      ...((err as any).meta && { meta: (err as any).meta }),
      ...((err as any).code && { code: (err as any).code }),
    });

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      data: (err as AppError).data || null,
    });
  }
};

export const ErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  if (error instanceof PrismaClientKnownRequestError) {
    error = handlePrismaKnownError(error);
  } else if (error instanceof PrismaClientValidationError) {
    error = handlePrismaValidationError(error);
  } else if (error instanceof PrismaClientInitializationError) {
    error = handlePrismaInitError(error);
  } else if (error instanceof PrismaClientUnknownRequestError) {
    error = handlePrismaUnknownError(error);
  } else if (error instanceof PrismaClientRustPanicError) {
    error = handlePrismaRustPanicError(error);
  } else if (error.name === 'ValidationError' && 'details' in error) {
    error = handleJoiValidationError(error as ValidationError);
  } else if (error.name === 'JsonWebTokenError') {
    error = handleJwtError();
  } else if (error.name === 'TokenExpiredError') {
    error = handleJWtExpiredError();
  } else if (!(error instanceof AppError)) {
    error = new AppError(error.message || 'Something went wrong', 500);
  }

  const nodeEnv = config.env?.toLowerCase() || 'development';

  if (nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};
