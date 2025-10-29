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
