export interface TestUser {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export const UserFactory = {
  createUniqueUser() {
    const timestamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`; // уникальное число
    return {
      name: 'QA',
      surname: 'engineer',
      email: `tester${timestamp}@f2fbank.local`,
      password: 'Hannibal_Lector'
    };
  }
};