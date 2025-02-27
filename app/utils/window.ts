export const openDisplayWindow = () => {
  const width = 1920; // Typical full HD width
  const height = 1080; // Typical full HD height
  const left = window.screen.width - width;
  const top = 0;

  window.open(
    '/display',
    'WaitlistDisplay',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
  );
}; 