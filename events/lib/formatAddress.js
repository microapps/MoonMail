import formatters from './countryAddressFormatters';

export default (contact = {}, recipientCountry = '') => {
  const country = recipientCountry || contact.country
  const formatter = formatters[country] || formatters['United States'];
  return formatter(contact).join('<br data-mce-bogus="1">');
};
