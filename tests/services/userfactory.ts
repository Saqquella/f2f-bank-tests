
export const UserFactory = {
  createUniqueUser() {
    const timestamp = Date.now(); // уникальное число
    return {
      name: 'QA',
      surname: 'engineer',
      email: `tester${timestamp}@f2fbank.local`,
      password: 'StrongPassword123'
    };
  }
};