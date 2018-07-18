// Initial support for checking auth

/*
*  Check is context.req.error or context.error 
*  have been defined.
*/
export const checkRequestError = context => {
  if (context && context.req && context.req.error) {
    return context.req.error;
  } else if (context && context.error) {
    return context.error;
  } else {
    return false;
  }
};
