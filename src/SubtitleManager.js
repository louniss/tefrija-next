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
import {unzip} from 'react-native-zip-archive';

const ass2srt = require('ass-to-srt');
const iconv = require('iconv-lite');
const RNFS = require('react-native-fs');
const path = RNFS.DocumentDirectoryPath;

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
    const url = `https://rest.opensubtitles.org/search/imdbid-${imdbId}/sublanguageid-${lang}`;
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      return response.data.map(item => ({
        downloadUrl: item.ZipDownloadLink,
        subDownloadUrl: item.SubDownloadLink,
        format: item.SubFormat,
        encoding: item.SubEncoding,
        id: item.IDSubtitle,
        fileName: item.SubFileName,
        downloads: item.SubDownloadsCnt,
      }));
    } catch (error) {
      console.error('fetchSubtitleLinks error: ', error);
      return [];
    }
  }

  async saveZippedSubtitle(url, subtitleId) {
    try {
      const filePath = `${path}/${subtitleId}.zip`;
      await RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
      }).promise;
      return filePath;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async subtitleUrlToText(subtitleInfo) {
    try {
      const {downloadUrl, format, encoding, id} = subtitleInfo;

      const subtitleFileZipped = await this.saveZippedSubtitle(downloadUrl, id);
      if (!subtitleFileZipped) return null;

      const unzippedDir = await unzip(subtitleFileZipped, `${path}/${id}`);
      const files = await RNFS.readDir(unzippedDir);

      let srtFile = files.find(file => file.name.endsWith('.srt'));
      const assFile = files.find(file => file.name.endsWith('.ass'));

      let targetFile;
      if (assFile && !srtFile) {
        targetFile = assFile;
      } else {
        targetFile = srtFile || files[0];
      }

      if (!targetFile) return null;

      let utf8Data, arabicData;

      try {
        utf8Data = await RNFS.readFile(targetFile.path, 'utf8');
        if (
          format === 'ass' ||
          format === 'ssa' ||
          targetFile.name.endsWith('.ass') ||
          targetFile.name.endsWith('.ssa')
        ) {
          utf8Data = ass2srt(utf8Data);
        }
      } catch (e) {}

      try {
        arabicData = await RNFS.readFile(targetFile.path, 'ascii');
        if (
          format === 'ass' ||
          format === 'ssa' ||
          targetFile.name.endsWith('.ass') ||
          targetFile.name.endsWith('.ssa')
        ) {
          arabicData = ass2srt(arabicData);
        }
        arabicData = iconv.decode(
          arabicData,
          encoding === 'CP1256' ? 'windows-1256' : 'windows-1256',
        );
      } catch (e) {}

      return {arabicData, utf8Data};
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}



export default SubtitleManager;
