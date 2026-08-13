export const isValidFullName = (value) =>
  /^[A-Za-z\s]{3,}$/.test(value.trim());

export const isValidPhoneNumber = (value) =>
  /^(\+62|62|0)8[1-9][0-9]{7,10}$/.test(value.trim());

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isValidPassword = (value) => value.length >= 6;
