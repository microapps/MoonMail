const formatters = {};

const trimValues = (strings, ...values) => {
  let result = strings.map((s, i) => {
    if (i === 0) s = s.replace('\n', '');
    return [s, values[i]];
  });
  return result
    .filter(el => el[1])
    .map(el => el.join(''))
    .join('')
    .split('\n');
};

/*
Australia
[<company>]
<address>
<address2>
<city>, <state> <zipCode>
[<country>]
*/

formatters.Australia = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.city}, ${info.state} ${info.zipCode}
    ${info.country}
  `;
};

/*
Brazil
[<company>]
<address>
<address2>
<zipCode> <city> <state>
[<country>]
*/

formatters.Brazil = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city} ${info.state}
    ${info.country}
  `;
};

/*
Bulgaria
[<country>]
<state>
<zipCode> <city>
<address>
<address2>
[<company>]
*/

formatters.Bulgaria = function(info) {
  return trimValues`${info.country}
    ${info.state}
    ${info.zipCode} ${info.city}
    ${info.address}
    ${info.address2}
    ${info.company}
   `;
};

/*
Canada
(English format)
[<company>]
<address>
<address2>
<city>, <state> <zipCode>
[<country>]
Note: <zipCode> has letter number letter number letter number format (X#X #X#).
*/

formatters.Canada = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.city}, ${info.state} ${info.zipCode}
    ${info.country}
  `;
};

/*
Canada
(French format)
<address>
<address2>
<city> (<state>)
<zipCode>
[<country>]
Note: <zipCode> has letter number letter number letter number format (X#X #X#).
*/

formatters.CanadaFrench = function(info) {
  return trimValues`
    ${info.address}
    ${info.address2}
    ${info.city} (${info.state})
    ${info.zipCode}
    ${info.country}
  `;
};

/*
China
[<country>]
<state> <city>
<address>
<address2>
*/

formatters.China = function(info) {
  return trimValues`
    ${info.country}
    ${info.state} ${info.city}
    ${info.address}
    ${info.address2}
  `;
};

/*
Croatia/Serbia/Slovenia (former Yugoslavia)

[<company>]
<address>
<address2>
<zipCode> <city>
<state>
[<country>]
*/

formatters.Yugoslavia = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.state}
    ${info.country}
  `;
};

formatters.Croatia = formatters.Yugoslavia;
formatters.Serbia = formatters.Yugoslavia;
formatters.Slovenia = formatters.Yugoslavia;

/*
Czech Republic
[<company>]
<address>
<address2>
<zipCode> <city>
<state>
[<country>]
*/

formatters['Czech Republic'] = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.state}
    ${info.country}
  `;
};

/*
Denmark
[<company>]
<address>
<address2>
[<countryCode> ]<zipCode> <city>
[<country>]
*/

formatters.Denmark = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.countryCode} ]${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Finland
[<company>]
<address>
<address2>
<zipCode> <city>
[<country>]
*/

formatters.Finland = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
France
[<company>]
<address>
<address2>
<zipCode> <city>
[<country>]
*/

formatters.France = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Germany
[<company>]
<address>
<address2>
<blank line>
[<countryCode>] <zipCode> <city>
Note: Typically, <address> is the department and <address2> is the street or postbox. The blank line between <address2> and <countryCode> and the hyphen between <countryCode> and <zipCode> are critical features. The postal code is five digits and has no separator. If mail is sent from abroad to Germany, <countryCode> plus a hyphen is added in front of the code (as in D XXXXX). The personal name appears first if the letter is of a personal nature, but the company name appears first in a business letter.
*/

formatters.Germany = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.countryCode} ${info.zipCode} ${info.city}
  `;
};

/*
Greece
<company>
<address>
<address2>
<zipCode> <city>
[<country>]
Note: The address format is <Street> <Number>. There are two spaces between <zipCode> and <city>. The personal name appears first if the letter is of a personal nature, but the company name appears first in a business letter.
*/

formatters.Greece = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Hungary
(Typical address for a company)
[<company>]
<zipCode> <city>
<address>
<address2>
<state>
[<country>]
*/

formatters.Hungary = function(info) {
  return trimValues`
    ${info.company}
    ${info.zipCode} ${info.city}
    ${info.address}
    ${info.address2}
    ${info.state}
    ${info.country}
  `;
};

/*
Italy
[<company>]
<address>
[blank line]
[<country>] <zipCode> <city> <state>
[<country>]
Note: <state>, which is represented by two uppercase letters in parentheses, is used only if the city is not a state capital. (The line with <countryAbbreviation> should use a negative indent.) Numbers (for example, house numbers) are always at the end of <address>for example, via Palmanova 12. An optional blank line between <address> and <countryAbbreviation> makes the address easier to read.
*/

formatters.Italy = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.country} ${info.zipCode} ${info.city} ${info.state}
    ${info.country}
  `;
};

/*
Japan
[<country>]
<zipCode> <state> <city>
<address>
<company>
*/

formatters.Japan = function(info) {
  return trimValues`
    ${info.country}
    ${info.zipCode} ${info.state} ${info.city}
    ${info.address}
    ${info.company}
  `;
};

/*
Korea
[<country>]
<zipCode>
<Do> <Si> <Dong> <Gu> <address #>
<company>
<LastName> <FirstName> <Honorific>
Note: Do means state, Si means city, Dong means Street, Block, or Village, and Gu means Ward or District. South Korea is divided into nine Do, each of which has its own government.
*/

formatters.Korea = function(info) {
  return trimValues`
    ${info.country}
    ${info.zipCode}
    ${info.state} ${info.city} ${info.address} ${info.address2} #>
    ${info.company}
  `;
};

/*
Latin America
(Typical address used in Spanish speaking countries)
[<company>]
<address>
<zipCode> <city>
<state>
[<country>]
*/

// mapping information based on https://en.wikipedia.org/wiki/Latin_America#Subregions_and_countries

formatters.latinAmerica = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.zipCode} ${info.city}
    ${info.state}
    ${info.country}
  `;
};

formatters.Argentina = formatters.latinAmerica;
formatters.Mexico = formatters.latinAmerica;
formatters.Colombia = formatters.latinAmerica;
formatters.Peru = formatters.latinAmerica;
formatters.Venezuela = formatters.latinAmerica;
formatters.Chile = formatters.latinAmerica;
formatters.Ecuador = formatters.latinAmerica;
formatters.Guatemala = formatters.latinAmerica;
formatters.Cuba = formatters.latinAmerica;

/*
Malaysia
[<company>]
<address>
<address2>
<zipCode> <city>
<state> [<country>]
*/

formatters.Malaysia = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.state} ${info.country}
  `;
};

/*
Netherlands
[<company>]
<address>
<address2>
<zipCode> <city>
[<country>]
*/

formatters.Netherlands = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Norway
<company>
<address>
<FirstName> <LastName>
<address2>
<zipCode> <city>
[<country>]
Note: A nonofficial letter to a person in a company is typically written with the person's name at the top of the address.
*/

formatters.Norway = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Poland
[<company>]
<address>
<address2>
<zipCode> <city>
<state>
[<country>]
*/

formatters.Poland = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.state}
    ${info.country}
  `;
};

/*
Portugal
[<company>]
<address>
<address2>
<city>
<zipCode>
[<country>]
Note: Example of <zipCode>: 1600 Lisboa.
*/

formatters.Portugal = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.city}
    ${info.zipCode}
    ${info.country}
  `;
};

/*
Romania
[<company>]
<address>
<address2>
<zipCode> <city>
<state>
[<country>]
*/

formatters.Romania = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.state}
    ${info.country}
  `;
};

/*
Russia
[<country>]
<zipCode>
[<state] <city>
<address>
<address2>
[<company>]
Note: The <state or Republic> and <Region> fields are used only if (a) the letter is sent to another state; (b) the city is not the capital of the region (for example, Moscow Region, Zvenigorod); or (c) the letter is sent from another state to a city that is not a regional capital, in which case both the name of the state and the name of the region are indicated (for example, Russia, Moscow Region, Zvenigorod). If <FirstName> and <SecondName> contain only initials followed by periods, it is more appropriate to include these fields on the same line with <LastName> (for example, LastName A. B.).
*/

formatters.Russia = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.state} ${info.city}
    ${info.country}
    ${info.zipCode}
  `;
};

/*
Spain
[<company>]
<address>
<zipCode> <city>
[<country>]
*/

formatters.Spain = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Sweden
Typical address for business correspondence
<company>
<address>
<address2>
<zipCode> <city>
[<country>]
*/

formatters.Sweden = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Switzerland
<company>
<address>
<address2>
<zipCode> <city>
[<country>]
*/

formatters.Switzerland = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode} ${info.city}
    ${info.country}
  `;
};

/*
Turkey
[<company>]
<address>
<address2>
<zipCode>, <city>
[<country>]
*/

formatters.Turkey = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.zipCode}, ${info.city}
    ${info.country}
  `;
};

/*
United Kingdom
[<company>]
<address>
<city>, <state> <zipCode>
[<country>]
Note: <zipCode> has letter number letter number letter number format (X#X #X#).
*/

formatters['United Kingdom'] = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.city}, ${info.state} ${info.zipCode}
    ${info.country}
  `;
};

/*
United States
[<company>]
<address>
<address2>
<city>, <state> <zipCode>
[<country>]
*/

formatters['United States'] = function(info) {
  return trimValues`
    ${info.company}
    ${info.address}
    ${info.address2}
    ${info.city}, ${info.state} ${info.zipCode}
    ${info.country}
   `;
};

export default formatters;
