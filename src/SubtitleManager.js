/**
 * https://www.opensubtitles.org/en/search/sublanguageid-${langId}/imdbid-${imdbId}
 * 1: https://www.opensubtitles.org/en/search/sublanguageid-ara/imdbid-2397391 example for arabic
 *
 * a request should be made to 1 with given id
 *
 * available langs: [{"title":"ALL","value":"all"},{"title":"ALL","value":"all"},{"title":"Abkhazian","value":"abk"},{"title":"Abkhazian","value":"abk"},{"title":"Afrikaans","value":"afr"},{"title":"Afrikaans","value":"afr"},{"title":"Albanian","value":"alb"},{"title":"Albanian","value":"alb"},{"title":"Amharic","value":"amh"},{"title":"Amharic","value":"amh"},{"title":"Arabic","value":"ara"},{"title":"Arabic","value":"ara"},{"title":"Aragonese","value":"arg"},{"title":"Aragonese","value":"arg"},{"title":"Armenian","value":"arm"},{"title":"Armenian","value":"arm"},{"title":"Assamese","value":"asm"},{"title":"Assamese","value":"asm"},{"title":"Asturian","value":"ast"},{"title":"Asturian","value":"ast"},{"title":"Azerbaijani","value":"aze"},{"title":"Azerbaijani","value":"aze"},{"title":"Basque","value":"baq"},{"title":"Basque","value":"baq"},{"title":"Belarusian","value":"bel"},{"title":"Belarusian","value":"bel"},{"title":"Bengali","value":"ben"},{"title":"Bengali","value":"ben"},{"title":"Bosnian","value":"bos"},{"title":"Bosnian","value":"bos"},{"title":"Breton","value":"bre"},{"title":"Breton","value":"bre"},{"title":"Bulgarian","value":"bul"},{"title":"Bulgarian","value":"bul"},{"title":"Burmese","value":"bur"},{"title":"Burmese","value":"bur"},{"title":"Catalan","value":"cat"},{"title":"Catalan","value":"cat"},{"title":"Chinese (Cantonese)","value":"zhc"},{"title":"Chinese (Cantonese)","value":"zhc"},{"title":"Chinese (simplified)","value":"chi"},{"title":"Chinese (simplified)","value":"chi"},{"title":"Chinese (traditional)","value":"zht"},{"title":"Chinese (traditional)","value":"zht"},{"title":"Chinese bilingual","value":"zhe"},{"title":"Chinese bilingual","value":"zhe"},{"title":"Croatian","value":"hrv"},{"title":"Croatian","value":"hrv"},{"title":"Czech","value":"cze"},{"title":"Czech","value":"cze"},{"title":"Danish","value":"dan"},{"title":"Danish","value":"dan"},{"title":"Dari","value":"prs"},{"title":"Dari","value":"prs"},{"title":"Dutch","value":"dut"},{"title":"Dutch","value":"dut"},{"title":"English","value":"eng"},{"title":"English","value":"eng"},{"title":"Esperanto","value":"epo"},{"title":"Esperanto","value":"epo"},{"title":"Estonian","value":"est"},{"title":"Estonian","value":"est"},{"title":"Extremaduran","value":"ext"},{"title":"Extremaduran","value":"ext"},{"title":"Finnish","value":"fin"},{"title":"Finnish","value":"fin"},{"title":"French","value":"fre"},{"title":"French","value":"fre"},{"title":"Gaelic","value":"gla"},{"title":"Gaelic","value":"gla"},{"title":"Galician","value":"glg"},{"title":"Galician","value":"glg"},{"title":"Georgian","value":"geo"},{"title":"Georgian","value":"geo"},{"title":"German","value":"ger"},{"title":"German","value":"ger"},{"title":"Greek","value":"ell"},{"title":"Greek","value":"ell"},{"title":"Hebrew","value":"heb"},{"title":"Hebrew","value":"heb"},{"title":"Hindi","value":"hin"},{"title":"Hindi","value":"hin"},{"title":"Hungarian","value":"hun"},{"title":"Hungarian","value":"hun"},{"title":"Icelandic","value":"ice"},{"title":"Icelandic","value":"ice"},{"title":"Igbo","value":"ibo"},{"title":"Igbo","value":"ibo"},{"title":"Indonesian","value":"ind"},{"title":"Indonesian","value":"ind"},{"title":"Interlingua","value":"ina"},{"title":"Interlingua","value":"ina"},{"title":"Irish","value":"gle"},{"title":"Irish","value":"gle"},{"title":"Italian","value":"ita"},{"title":"Italian","value":"ita"},{"title":"Japanese","value":"jpn"},{"title":"Japanese","value":"jpn"},{"title":"Kannada","value":"kan"},{"title":"Kannada","value":"kan"},{"title":"Kazakh","value":"kaz"},{"title":"Kazakh","value":"kaz"},{"title":"Khmer","value":"khm"},{"title":"Khmer","value":"khm"},{"title":"Korean","value":"kor"},{"title":"Korean","value":"kor"},{"title":"Kurdish","value":"kur"},{"title":"Kurdish","value":"kur"},{"title":"Kyrgyz","value":"kir"},{"title":"Kyrgyz","value":"kir"},{"title":"Latvian","value":"lav"},{"title":"Latvian","value":"lav"},{"title":"Lithuanian","value":"lit"},{"title":"Lithuanian","value":"lit"},{"title":"Luxembourgish","value":"ltz"},{"title":"Luxembourgish","value":"ltz"},{"title":"Macedonian","value":"mac"},{"title":"Macedonian","value":"mac"},{"title":"Malay","value":"may"},{"title":"Malay","value":"may"},{"title":"Malayalam","value":"mal"},{"title":"Malayalam","value":"mal"},{"title":"Manipuri","value":"mni"},{"title":"Manipuri","value":"mni"},{"title":"Marathi","value":"mar"},{"title":"Marathi","value":"mar"},{"title":"Mongolian","value":"mon"},{"title":"Mongolian","value":"mon"},{"title":"Montenegrin","value":"mne"},{"title":"Montenegrin","value":"mne"},{"title":"Navajo","value":"nav"},{"title":"Navajo","value":"nav"},{"title":"Nepali","value":"nep"},{"title":"Nepali","value":"nep"},{"title":"Northern Sami","value":"sme"},{"title":"Northern Sami","value":"sme"},{"title":"Norwegian","value":"nor"},{"title":"Norwegian","value":"nor"},{"title":"Occitan","value":"oci"},{"title":"Occitan","value":"oci"},{"title":"Odia","value":"ori"},{"title":"Odia","value":"ori"},{"title":"Persian","value":"per"},{"title":"Persian","value":"per"},{"title":"Polish","value":"pol"},{"title":"Polish","value":"pol"},{"title":"Portuguese","value":"por"},{"title":"Portuguese","value":"por"},{"title":"Portuguese (BR)","value":"pob"},{"title":"Portuguese (BR)","value":"pob"},{"title":"Portuguese (MZ)","value":"pom"},{"title":"Portuguese (MZ)","value":"pom"},{"title":"Pushto","value":"pus"},{"title":"Pushto","value":"pus"},{"title":"Romanian","value":"rum"},{"title":"Romanian","value":"rum"},{"title":"Russian","value":"rus"},{"title":"Russian","value":"rus"},{"title":"Santali","value":"sat"},{"title":"Santali","value":"sat"},{"title":"Serbian","value":"scc"},{"title":"Serbian","value":"scc"},{"title":"Sindhi","value":"snd"},{"title":"Sindhi","value":"snd"},{"title":"Sinhalese","value":"sin"},{"title":"Sinhalese","value":"sin"},{"title":"Slovak","value":"slo"},{"title":"Slovak","value":"slo"},{"title":"Slovenian","value":"slv"},{"title":"Slovenian","value":"slv"},{"title":"Somali","value":"som"},{"title":"Somali","value":"som"},{"title":"Sorbian languages","value":"wen"},{"title":"Sorbian languages","value":"wen"},{"title":"South Azerbaijani","value":"azb"},{"title":"South Azerbaijani","value":"azb"},{"title":"Spanish","value":"spa"},{"title":"Spanish","value":"spa"},{"title":"Spanish (EU)","value":"spn"},{"title":"Spanish (EU)","value":"spn"},{"title":"Spanish (LA)","value":"spl"},{"title":"Spanish (LA)","value":"spl"},{"title":"Swahili","value":"swa"},{"title":"Swahili","value":"swa"},{"title":"Swedish","value":"swe"},{"title":"Swedish","value":"swe"},{"title":"Syriac","value":"syr"},{"title":"Syriac","value":"syr"},{"title":"Tagalog","value":"tgl"},{"title":"Tagalog","value":"tgl"},{"title":"Tamil","value":"tam"},{"title":"Tamil","value":"tam"},{"title":"Tatar","value":"tat"},{"title":"Tatar","value":"tat"},{"title":"Telugu","value":"tel"},{"title":"Telugu","value":"tel"},{"title":"Tetum","value":"tet"},{"title":"Tetum","value":"tet"},{"title":"Thai","value":"tha"},{"title":"Thai","value":"tha"},{"title":"Toki Pona","value":"tok"},{"title":"Toki Pona","value":"tok"},{"title":"Turkish","value":"tur"},{"title":"Turkish","value":"tur"},{"title":"Turkmen","value":"tuk"},{"title":"Turkmen","value":"tuk"},{"title":"Ukrainian","value":"ukr"},{"title":"Ukrainian","value":"ukr"},{"title":"Urdu","value":"urd"},{"title":"Urdu","value":"urd"},{"title":"Uzbek","value":"uzb"},{"title":"Uzbek","value":"uzb"},{"title":"Vietnamese","value":"vie"},{"title":"Vietnamese","value":"vie"},{"title":"Welsh","value":"wel"},{"title":"Welsh","value":"wel"}]
 *
 */

import axios from 'axios';
import {zip, unzip, unzipAssets} from 'react-native-zip-archive';

import {jsdom} from 'jsdom-jscore-rn';

const iconv = require('iconv-lite');
const RNFS = require('react-native-fs');
const path = RNFS.DocumentDirectoryPath;

const ass2srt = require('ass-to-srt');
const COOKIE =
  '_ga=GA1.1.738056706.1742357633; searchform=formname%3Dsearchform%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C1%7C%7C%7C1%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C%7C; download-counter=4; pref_mk=%7B%22tv%22%3A1%2C%22m%22%3A4%7D; remember_sid=-5aNuKxqZ3RsAKx3KGuNcu08EK6; weblang=en; user=fohipeort; _ga_1D0CX3QS3M=GS1.1.1746053485.3.1.1746053948.60.0.0; PHPSESSID=-5aNuKxqZ3RsAKx3KGuNcu08EK6; techaro.lol-anubis-cookie-verification=019d3e70-54a6-7565-be56-2a40e3fda0f8; cf_clearance=sjBYbuzwWhOb_fKVhlCUZ0hREY3Q8IxvKXvME1YTnl8-1774869042-1.2.1.1-lVri2QkvyLAKObDKoS_3Koy2p2nMcB0nY6MiQXB_KSXgKFPgNWD_M1ooOnSJnJMUrY0Cm.SRM3.Ni9zfWgwEe11AwkI5tZOX911gGSk37oktEYvZfh_.Te7hgz1h17fVqwiMLMwVu94j3w8_Yd9x6cAY2TDgi5YeAJga4Ala6B2IssFx2.KtmpeQVvPdKZ5EPeQflPNyBjQo2x_JZUr_n83neyRB_BDiXPcHSnyV6Xs; techaro.lol-anubis-auth=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhY3Rpb24iOiJDSEFMTEVOR0UiLCJjaGFsbGVuZ2UiOiIwMTlkM2U3MC01NGE2LTc1NjUtYmU1Ni0yYTQwZTNmZGEwZjgiLCJleHAiOjE3NzU0NzM4NDMsImlhdCI6MTc3NDg2OTA0MywibWV0aG9kIjoiZmFzdCIsIm5iZiI6MTc3NDg2ODk4MywicG9saWN5UnVsZSI6Ijg0ZmQ4ZDdmMmM0MjAwNDgiLCJyZXN0cmljdGlvbiI6IjQwOWIyNmU0YWI2ZDcxYTliYTcwZWFmNzhiYjgwYjYxNmY3OGJkNTA3NTRmZWIwY2I5N2NlM2E5NzNmM2ZlYzcifQ._OKba8DAyv2C2Xbo67u0duwDi7-8YT8oXtl-GlLCuKK4Ca1ZHMrvpXzQPCzen-Zlvy5nWAFRNpQcfp4A2YgWDg; logged=1';

const LANGS = [
  {title: 'Abkhazian', value: 'abk'},
  {title: 'Afrikaans', value: 'afr'},
  {title: 'Albanian', value: 'alb'},
  {title: 'Amharic', value: 'amh'},
  {title: 'Arabic', value: 'ara'},
  {title: 'Aragonese', value: 'arg'},
  {title: 'Armenian', value: 'arm'},
  {title: 'Assamese', value: 'asm'},
  {title: 'Asturian', value: 'ast'},
  {title: 'Azerbaijani', value: 'aze'},
  {title: 'Basque', value: 'baq'},
  {title: 'Belarusian', value: 'bel'},
  {title: 'Bengali', value: 'ben'},
  {title: 'Bosnian', value: 'bos'},
  {title: 'Breton', value: 'bre'},
  {title: 'Bulgarian', value: 'bul'},
  {title: 'Burmese', value: 'bur'},
  {title: 'Catalan', value: 'cat'},
  {title: 'Chinese (Cantonese)', value: 'zhc'},
  {title: 'Chinese (simplified)', value: 'chi'},
  {title: 'Chinese (traditional)', value: 'zht'},
  {title: 'Chinese bilingual', value: 'zhe'},
  {title: 'Croatian', value: 'hrv'},
  {title: 'Czech', value: 'cze'},
  {title: 'Danish', value: 'dan'},
  {title: 'Dari', value: 'prs'},
  {title: 'Dutch', value: 'dut'},
  {title: 'English', value: 'eng'},
  {title: 'Esperanto', value: 'epo'},
  {title: 'Estonian', value: 'est'},
  {title: 'Extremaduran', value: 'ext'},
  {title: 'Finnish', value: 'fin'},
  {title: 'French', value: 'fre'},
  {title: 'Gaelic', value: 'gla'},
  {title: 'Galician', value: 'glg'},
  {title: 'Georgian', value: 'geo'},
  {title: 'German', value: 'ger'},
  {title: 'Greek', value: 'ell'},
  {title: 'Hebrew', value: 'heb'},
  {title: 'Hindi', value: 'hin'},
  {title: 'Hungarian', value: 'hun'},
  {title: 'Icelandic', value: 'ice'},
  {title: 'Igbo', value: 'ibo'},
  {title: 'Indonesian', value: 'ind'},
  {title: 'Interlingua', value: 'ina'},
  {title: 'Irish', value: 'gle'},
  {title: 'Italian', value: 'ita'},
  {title: 'Japanese', value: 'jpn'},
  {title: 'Kannada', value: 'kan'},
  {title: 'Kazakh', value: 'kaz'},
  {title: 'Khmer', value: 'khm'},
  {title: 'Korean', value: 'kor'},
  {title: 'Kurdish', value: 'kur'},
  {title: 'Kyrgyz', value: 'kir'},
  {title: 'Latvian', value: 'lav'},
  {title: 'Lithuanian', value: 'lit'},
  {title: 'Luxembourgish', value: 'ltz'},
  {title: 'Macedonian', value: 'mac'},
  {title: 'Malay', value: 'may'},
  {title: 'Malayalam', value: 'mal'},
  {title: 'Manipuri', value: 'mni'},
  {title: 'Marathi', value: 'mar'},
  {title: 'Mongolian', value: 'mon'},
  {title: 'Montenegrin', value: 'mne'},
  {title: 'Navajo', value: 'nav'},
  {title: 'Nepali', value: 'nep'},
  {title: 'Northern Sami', value: 'sme'},
  {title: 'Norwegian', value: 'nor'},
  {title: 'Occitan', value: 'oci'},
  {title: 'Odia', value: 'ori'},
  {title: 'Persian', value: 'per'},
  {title: 'Polish', value: 'pol'},
  {title: 'Portuguese', value: 'por'},
  {title: 'Portuguese (BR)', value: 'pob'},
  {title: 'Portuguese (MZ)', value: 'pom'},
  {title: 'Pushto', value: 'pus'},
  {title: 'Romanian', value: 'rum'},
  {title: 'Russian', value: 'rus'},
  {title: 'Santali', value: 'sat'},
  {title: 'Serbian', value: 'scc'},
  {title: 'Sindhi', value: 'snd'},
  {title: 'Sinhalese', value: 'sin'},
  {title: 'Slovak', value: 'slo'},
  {title: 'Slovenian', value: 'slv'},
  {title: 'Somali', value: 'som'},
  {title: 'Sorbian languages', value: 'wen'},
  {title: 'South Azerbaijani', value: 'azb'},
  {title: 'Spanish', value: 'spa'},
  {title: 'Spanish (EU)', value: 'spn'},
  {title: 'Spanish (LA)', value: 'spl'},
  {title: 'Swahili', value: 'swa'},
  {title: 'Swedish', value: 'swe'},
  {title: 'Syriac', value: 'syr'},
  {title: 'Tagalog', value: 'tgl'},
  {title: 'Tamil', value: 'tam'},
  {title: 'Tatar', value: 'tat'},
  {title: 'Telugu', value: 'tel'},
  {title: 'Tetum', value: 'tet'},
  {title: 'Thai', value: 'tha'},
  {title: 'Toki Pona', value: 'tok'},
  {title: 'Turkish', value: 'tur'},
  {title: 'Turkmen', value: 'tuk'},
  {title: 'Ukrainian', value: 'ukr'},
  {title: 'Urdu', value: 'urd'},
  {title: 'Uzbek', value: 'uzb'},
  {title: 'Vietnamese', value: 'vie'},
  {title: 'Welsh', value: 'wel'},
];

class SubtitleManager {
  constructor() {
    this.langs = LANGS;
  }

  async fetchSubtitleLinks(imdbId, lang) {
    const langId = lang;
    const url = `https://opensubtitles.org/en/search/sublanguageid-${langId}/imdbid-${imdbId}`;
    try {
      const params = {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: COOKIE,
        },
        redirect: 'follow',
      };
      let response = await fetch(url, params);

      const text = await response.text();
      const dom = jsdom(text);

      if (url !== response.url) {
        const downloadLink = dom.querySelector('#bt-dwl-bt');
        if (downloadLink) {
          const id = downloadLink.getAttribute('data-product-id');
          return [`https://dl.opensubtitles.org/${lang}/download/sub/${id}`];
        }
      }

      const links = dom.querySelectorAll('td strong a.bnone');
      const subtitleIds = [];

      for (let i = 0; i < links.length; i++) {
        const href = links[i].getAttribute('href');
        const id = href.split('/')[3];
        subtitleIds.push(id);
      }

      const subtitleLinks = subtitleIds.map(
        id => `https://dl.opensubtitles.org/${lang}/download/sub/${id}`,
      );
      return subtitleLinks;
    } catch (error) {
      console.error('fetchSubtitleLinks error: ', error);
      return [];
    }
  }

  async saveZippedSubtitle(url) {
    const subtitleId = url.split('/')[6];
    console.log('sub id', subtitleId);
    try {
      await RNFS.downloadFile({
        headers: {
          Cookie: COOKIE,
        },
        fromUrl: url,
        toFile: `${path}/${subtitleId}.zip`,
      }).promise;
      return `${path}/${subtitleId}.zip`;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async subtitleUrlToText(subtitleUrl) {
    try {
      const subtitleFileZipped = await this.saveZippedSubtitle(subtitleUrl);
      const subtitleId = subtitleUrl.split('/')[6];
      const dir = path;
      await RNFS.readDir(dir).then(files => {
        console.log('files in dir: ', files);
      });
      const unzipped = await unzip(subtitleFileZipped, `${path}/${subtitleId}`);

      const files = await RNFS.readDir(unzipped);

      let strFile = files.find(file => file.name.endsWith('.srt'));
      const assFile = files.find(file => file.name.endsWith('.ass'));

      let utf8Data, arabicData;

      if (assFile) {
        strFile = assFile.path;
      } else {
        strFile = strFile.path;
      }

      try {
        utf8Data = await RNFS.readFile(strFile, 'utf8');
        if (assFile) {
          utf8Data = ass2srt(utf8Data);
        }
      } catch (error) {}

      try {
        arabicData = await RNFS.readFile(strFile, 'ascii');
        if (assFile) {
          arabicData = ass2srt(arabicData);
        }
        arabicData = iconv.decode(arabicData, 'windows-1256');
      } catch (error) {}

      return {arabicData, utf8Data};
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

export default SubtitleManager;
