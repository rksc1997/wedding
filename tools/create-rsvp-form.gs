/**
 * create-rsvp-form.gs — builds the RSVP Google Form in one run.
 *
 * HOW TO USE
 *   1. Go to https://script.google.com and click "New project".
 *   2. Delete whatever is in the editor and paste this whole file in.
 *   3. Make sure the function dropdown says "createRsvpForm", then press Run.
 *   4. Google will ask you to authorise the script the first time. It only
 *      touches the form and spreadsheet it creates.
 *   5. When it finishes, open View -> Logs (or the Execution log panel).
 *      It prints three links. Copy the EMBED URL.
 *   6. Paste that into googleFormEmbedUrl in js/config.js, then commit
 *      and push.
 *
 * The questions deliberately mirror the fields already on the website, so
 * nothing is lost by switching to the Google Form.
 *
 * Note: this does NOT use setCollectEmail(). That option forces respondents
 * to sign in to a Google account, which would shut out any guest who hasn't
 * got one. Email is a normal question instead.
 */

function createRsvpForm() {
  var EVENTS = [
    'Mehendi — Fri 20 Nov, The Park',
    'Haldi — Fri 20 Nov, The Park',
    'Gaur — Fri 20 Nov, The Park',
    'The Wedding — Sat 21 Nov, Akshardham Temple, Joka',
    'Reception — Sun 22 Nov, Westside Pavilion, Nicco Park'
  ];

  var form = FormApp.create('Rahul & Tanvi — RSVP');

  form.setTitle('Rahul & Tanvi — RSVP');
  form.setDescription(
    'We are getting married in Kolkata from 20 to 22 November 2026, and we ' +
    'would love you to be there.\n\n' +
    'One response per household is fine — just tell us how many of you there ' +
    'are. Any questions, write to tanvijindal98@gmail.com.'
  );

  // Guests may not have a Google account, and may want to amend later.
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(false);
  form.setConfirmationMessage(
    'Thank you — we have got it, and we look forward to seeing you in Kolkata.'
  );

  // Only meaningful on Workspace accounts; harmless to skip otherwise.
  try {
    form.setRequireLogin(false);
  } catch (e) {
    Logger.log('Note: setRequireLogin not applicable on this account (' + e + ')');
  }

  // --- who ----------------------------------------------------------------
  form.addTextItem()
      .setTitle('Your name')
      .setHelpText('First and last name')
      .setRequired(true);

  form.addTextItem()
      .setTitle('Email')
      .setRequired(true)
      .setValidation(
        FormApp.createTextValidation()
               .setHelpText('Please enter a valid email address.')
               .requireTextIsEmail()
               .build()
      );

  form.addTextItem()
      .setTitle('Phone')
      .setHelpText('Include the country code if you are outside India.')
      .setRequired(true);

  // --- coming? ------------------------------------------------------------
  form.addMultipleChoiceItem()
      .setTitle('Are you coming?')
      .setChoiceValues(['Joyfully yes', 'Sadly, no', 'Not sure yet'])
      .setRequired(true);

  form.addListItem()
      .setTitle('How many of you in total?')
      .setHelpText('Including yourself, and please count children.')
      .setChoiceValues(['1', '2', '3', '4', '5', '6 or more']);

  form.addCheckboxItem()
      .setTitle('Which events will you be at?')
      .setChoiceValues(EVENTS);

  // --- logistics ----------------------------------------------------------
  form.addListItem()
      .setTitle('Where are you travelling from?')
      .setChoiceValues(['Kolkata — local', 'Elsewhere in India', 'Outside India']);

  form.addTextItem()
      .setTitle('Dietary needs or allergies')
      .setHelpText('All the food is vegetarian. Tell us about allergies or ' +
                   'anything specific and we will pass it to the caterers.');

  form.addParagraphTextItem()
      .setTitle('Anything else?');

  // --- responses into a spreadsheet --------------------------------------
  var ss = SpreadsheetApp.create('Rahul & Tanvi — RSVP responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // --- the bit you need ---------------------------------------------------
  var published = form.getPublishedUrl();
  var embed = published.indexOf('?') === -1
    ? published + '?embedded=true'
    : published + '&embedded=true';

  Logger.log('');
  Logger.log('=====================================================');
  Logger.log('EMBED URL  (paste this into js/config.js):');
  Logger.log(embed);
  Logger.log('-----------------------------------------------------');
  Logger.log('Share with guests directly : ' + published);
  Logger.log('Edit the form              : ' + form.getEditUrl());
  Logger.log('Responses spreadsheet      : ' + ss.getUrl());
  Logger.log('=====================================================');
  Logger.log('');
  Logger.log('To be emailed on each response: open the responses');
  Logger.log('spreadsheet, then Tools -> Notification settings.');

  return embed;
}
