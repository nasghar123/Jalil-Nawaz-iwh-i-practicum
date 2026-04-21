const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const TOKEN = process.env.PRIVATE_APP_ACCESS_TOKEN;
const OBJECT_TYPE = process.env.HUBSPOT_OBJECT_TYPE || 'contacts';

const PROP_CONFIG = [
  {
    key: process.env.CRM_PROPERTY_NAME || 'practicum_name',
    label: 'Practicum Name',
  },
  {
    key: process.env.CRM_PROPERTY_SPECIES || 'species',
    label: 'Species',
  },
  {
    key: process.env.CRM_PROPERTY_BIO || 'bio',
    label: 'Bio',
  },
];

const PROPERTY_KEYS = PROP_CONFIG.map((p) => p.key);
const LIST_PROPERTIES = ['email', ...PROPERTY_KEYS];

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const hsClient = axios.create({
  baseURL: HUBSPOT_BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
});

function assertToken(res) {
  if (!TOKEN) {
    res
      .status(500)
      .send(
        'Missing PRIVATE_APP_ACCESS_TOKEN. Add it to a local .env file (do not commit).'
      );
    return false;
  }
  return true;
}

app.get('/', async (req, res) => {
  if (!assertToken(res)) return;

  try {
    const params = new URLSearchParams({
      limit: '100',
      archived: 'false',
    });
    LIST_PROPERTIES.forEach((key) => params.append('properties', key));

    const response = await hsClient.get(
      `/crm/v3/objects/${OBJECT_TYPE}?${params.toString()}`
    );
    const records = response.data.results || [];

    res.render('homepage', {
      title: 'CRM Records | Integrating With HubSpot I Practicum',
      records,
      propConfig: PROP_CONFIG,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Error fetching CRM records.');
  }
});

app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
    propConfig: PROP_CONFIG,
  });
});

app.post('/update-cobj', async (req, res) => {
  if (!assertToken(res)) return;

  try {
    const properties = {
      email: req.body.email,
    };
    PROP_CONFIG.forEach((p) => {
      properties[p.key] = req.body[p.key];
    });

    await hsClient.post(`/crm/v3/objects/${OBJECT_TYPE}`, { properties });
    res.redirect('/');
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Error creating CRM record.');
  }
});

app.listen(PORT, () =>
  console.log(`Listening on http://localhost:${PORT}`)
);
