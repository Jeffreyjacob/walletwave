import Joi, { ObjectSchema } from 'joi';
import { IUser } from '../interfaces/interface';

export const registerValidator = async (
  reqBody: IUser['register']
): Promise<IUser['register']> => {
  const validators: ObjectSchema<IUser['register']> = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().lowercase().required(),
    password: Joi.string().required(),
  });

  return validators.validateAsync(reqBody, { abortEarly: false });
};

export const loginValidators = async (
  reqBody: IUser['login']
): Promise<IUser['login']> => {
  const validatos: ObjectSchema<IUser['login']> = Joi.object({
    email: Joi.string().lowercase().required(),
    password: Joi.string().required(),
  });
  return validatos.validateAsync(reqBody, { abortEarly: false });
};
