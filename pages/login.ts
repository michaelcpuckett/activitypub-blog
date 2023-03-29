import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const formElement = window.document.querySelector('form');

formElement?.addEventListener('submit', (event) => {
  event.preventDefault();

  const email =
    formElement?.querySelector<HTMLInputElement>('[name="email"]')?.value ?? '';
  const password =
    formElement?.querySelector<HTMLInputElement>('[name="password"]')?.value ??
    '';
  const username =
    formElement?.querySelector<HTMLInputElement>('[name="username"]')?.value ??
    '';

  fetch('/user', {
    method: 'POST',
    headers: {
      Accept: 'application/activity+json',
    },
    body: JSON.stringify({
      type: 'Person',
      email,
      password,
      preferredUsername: username,
    }),
  })
    .then((response) => response.text())
    .then((result) => {
      try {
        const { success, error: errorMessage, field } = JSON.parse(result);

        if (!success) {
          throw errorMessage;
        }
      } catch (error) {
        throw error;
      }

      initializeApp({
        projectId: 'pickpuck-com',
        apiKey: 'AIzaSyB6ocubyR0Ddg7NdmA1bIFiuOH4nnVSI4w',
      });

      signInWithEmailAndPassword(getAuth(), email, password).then(
        (userCredential) => {
          userCredential.user.getIdToken().then((token: string) => {
            window.document.cookie = '__session=' + token;
            window.location.href = '/home';
          });
        },
      );
    })
    .catch((error) => {
      console.log(error);
    });
});
