import * as showdown from 'showdown';

const editProfileFormElement = window.document.querySelector(
  'form[data-action="edit-profile"]',
);

editProfileFormElement?.addEventListener('submit', (event) => {
  event.preventDefault();

  const outboxUrl = editProfileFormElement.getAttribute('action') ?? '';
  const followersUrl =
    editProfileFormElement.getAttribute('data-followers-url') ?? '';
  const actorId = editProfileFormElement.getAttribute('data-actor-id') ?? '';

  const name =
    editProfileFormElement?.querySelector<HTMLInputElement>('[name="name"]')
      ?.value ?? '';
  const summary =
    editProfileFormElement?.querySelector<HTMLTextAreaElement>(
      '[name="summary"]',
    )?.value ?? '';

  const converter = new showdown.Converter();
  const htmlSummary = converter.makeHtml(summary);

  fetch(outboxUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/activity+json',
    },
    body: JSON.stringify({
      '@context': ['https://www.w3.org/ns/activitystreams'],
      type: 'Update',
      actor: actorId,
      to: ['https://www.w3.org/ns/activitystreams#Public', followersUrl],
      object: {
        id: actorId,
        name,
        summary: htmlSummary,
      },
    }),
  })
    .then((response) => {
      if (response.headers.get('Location')) {
        window.location.reload();
      }
    })
    .catch((error) => {
      console.log(error);
    });
});

const newMicroblogStatusFormElement = window.document.querySelector(
  '[data-action="new-microblog-status"]',
);

newMicroblogStatusFormElement?.addEventListener('submit', (event) => {
  event.preventDefault();

  const outboxUrl = newMicroblogStatusFormElement.getAttribute('action') ?? '';
  const followersUrl =
    newMicroblogStatusFormElement.getAttribute('data-followers-url') ?? '';
  const actorId =
    newMicroblogStatusFormElement.getAttribute('data-actor-id') ?? '';
  const content =
    newMicroblogStatusFormElement.querySelector<HTMLTextAreaElement>(
      '[name="content"]',
    )?.value ?? '';

  const converter = new showdown.Converter();
  const htmlContent = converter.makeHtml(content);

  fetch(outboxUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/activity+json',
    },
    body: JSON.stringify({
      '@context': ['https://www.w3.org/ns/activitystreams'],
      type: 'Create',
      actor: actorId,
      to: ['https://www.w3.org/ns/activitystreams#Public', followersUrl],
      object: {
        type: 'Note',
        content: htmlContent,
      },
    }),
  })
    .then((response) => {
      if (response.headers.get('Location')) {
        window.location.reload();
      }
    })
    .catch((error) => {
      console.log(error);
    });
});

const newBlogPostFormElement = window.document.querySelector(
  '[data-action="new-blog-post"]',
);

newBlogPostFormElement?.addEventListener('submit', (event) => {
  event.preventDefault();

  const outboxUrl = newBlogPostFormElement.getAttribute('action') ?? '';
  const followersUrl =
    newBlogPostFormElement.getAttribute('data-followers-url') ?? '';
  const actorId = newBlogPostFormElement.getAttribute('data-actor-id') ?? '';
  const summary =
    newBlogPostFormElement.querySelector<HTMLInputElement>('[name="summary"]')
      ?.value ?? '';
  const content =
    newBlogPostFormElement.querySelector<HTMLTextAreaElement>(
      '[name="content"]',
    )?.value ?? '';

  const converter = new showdown.Converter();
  const htmlContent = converter.makeHtml(content);
  const htmlSummary = converter.makeHtml(summary);

  fetch(outboxUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/activity+json',
    },
    body: JSON.stringify({
      '@context': ['https://www.w3.org/ns/activitystreams'],
      type: 'Create',
      actor: actorId,
      to: ['https://www.w3.org/ns/activitystreams#Public', followersUrl],
      object: {
        type: 'Article',
        summary: htmlSummary,
        content: htmlContent,
        source: {
          content,
          mediaType: 'text/markdown',
        },
      },
    }),
  })
    .then((response) => {
      if (response.headers.get('Location')) {
        window.location.reload();
      }
    })
    .catch((error) => {
      console.log(error);
    });
});
