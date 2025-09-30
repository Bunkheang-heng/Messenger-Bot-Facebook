import axios from 'axios';

export async function sendTextMessage(
  pageAccessToken: string,
  recipientPsid: string,
  text: string
): Promise<void> {
  const url = `https://graph.facebook.com/v18.0/me/messages`;
  await axios.post(
    url,
    {
      recipient: { id: recipientPsid },
      messaging_type: 'RESPONSE',
      message: { text }
    },
    {
      params: { access_token: pageAccessToken },
      timeout: 10000
    }
  );
}


