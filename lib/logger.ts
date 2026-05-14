const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  error: (scope: string, message: string) => {
    if (isDev) {
      console.error(`[${scope}]`, message);
    }
  },
};
