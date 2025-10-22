export interface IUser {
  register: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
  login: {
    email: string;
    password: string;
  };
}
