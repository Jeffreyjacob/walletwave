import Joi, { ObjectSchema } from 'joi';
import { IWallet } from '../interfaces/interface';

export const generateOnBoardingLinkValidators = async (
  reqBody: IWallet['generateOnBoardingLink']
): Promise<IWallet['generateOnBoardingLink']> => {
  const validators: ObjectSchema<IWallet['generateOnBoardingLink']> =
    Joi.object({
      accountId: Joi.string().required(),
    });

  return validators.validateAsync(reqBody, { abortEarly: false });
};

export const fundWalletValidators = async (
  reqBody: IWallet['fundWallet']
): Promise<IWallet['fundWallet']> => {
  const validators: ObjectSchema<IWallet['fundWallet']> = Joi.object({
    amount: Joi.number().min(1).required(),
  });

  return validators.validateAsync(reqBody, { abortEarly: false });
};
