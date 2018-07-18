// Initial support for checking auth

/*
*  Check is context.req.error or context.error 
*  have been defined.
*/
export const checkRequestError = context => {
  return context.req.error || context.error;
};
