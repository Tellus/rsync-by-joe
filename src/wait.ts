export async function wait (milliseconds:number): Promise<string> {
  return new Promise((resolve) => {
    if (typeof milliseconds !== 'number') {
      throw new Error('milliseconds not a number');
    }
    setTimeout(() => resolve("done!"), milliseconds)
  });
};

export default wait;