export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'X-Passcode',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (request.headers.get('X-Passcode') !== env.PASSCODE) {
      return new Response(JSON.stringify({ error: 'Wrong passcode' }), { status: 401, headers: cors });
    }

    const phone = new URL(request.url).searchParams.get('phone');
    if (!phone) {
      return new Response(JSON.stringify({ error: 'No phone number' }), { status: 400, headers: cors });
    }

    const url = 'https://lookups.twilio.com/v2/PhoneNumbers/' +
      encodeURIComponent(phone) + '?Fields=caller_name';
    const auth = btoa(env.TWILIO_KEY_SID + ':' + env.TWILIO_KEY_SECRET);

    const resp = await fetch(url, { headers: { Authorization: 'Basic ' + auth } });
    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Twilio error' }), { status: 502, headers: cors });
    }

    const name = data.caller_name && data.caller_name.caller_name;
    return new Response(JSON.stringify({ name: name || null }), { headers: cors });
  }
};
