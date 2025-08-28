// utils/emailTemplates.js
const { APP_NAME = 'CMS' } = process.env

function approvedUserEmail({ username }) {
  const subject = `[${APP_NAME}] Twoje konto zostało zatwierdzone`
  const text = `Cześć ${username || ''},

Twoje konto w ${APP_NAME} zostało zatwierdzone. Możesz się teraz zalogować.

Pozdrawiamy,
Zespół ${APP_NAME}
`
  const html = `
  <p>Cześć ${username || ''},</p>
  <p>Twoje konto w <b>${APP_NAME}</b> zostało <b>zatwierdzone</b>. Możesz się teraz zalogować.</p>
  <p>Pozdrawiamy,<br>Zespół ${APP_NAME}</p>
  `
  return { subject, text, html }
}

function rejectedUserEmail({ username }) {
  const subject = `[${APP_NAME}] Wniosek rejestracyjny odrzucony`
  const text = `Cześć ${username || ''},

Niestety Twój wniosek rejestracyjny do ${APP_NAME} został odrzucony.

Pozdrawiamy,
Zespół ${APP_NAME}
`
  const html = `
  <p>Cześć ${username || ''},</p>
  <p>Niestety Twój wniosek rejestracyjny do <b>${APP_NAME}</b> został odrzucony.</p>
  <p>Pozdrawiamy,<br>Zespół ${APP_NAME}</p>
  `
  return { subject, text, html }
}

module.exports = { approvedUserEmail, rejectedUserEmail }
