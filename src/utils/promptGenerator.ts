import { SubtitleCue, PromptConfig, TranslationTone } from '../types/subtitle';
import { cuesToSRT } from './srtParser';

export function getToneDescription(tone: TranslationTone): string {
  switch (tone) {
    case 'natural_spoken':
      return 'Φυσική, ζωντανή καθημερινή καθομιλουμένη (όπως μιλάνε σύγχρονοι Έλληνες σε καλές κινηματογραφικές ταινίες/σειρές). Αποφυγή αρχαϊσμών ή άκαμπτων λεξικογραφικών μεταφράσεων.';
    case 'youth_slang':
      return 'Νεανικό, φρέσκο ύφος με σύγχρονη ελληνική αργκό/slang, φυσικές ατάκες και αυθορμητισμό.';
    case 'formal_doc':
      return 'Επίσημο, προσεγμένο και ακριβές λεξιλόγιο (κατάλληλο για ντοκιμαντέρ, επιστημονικά θέματα ή ιστορικές ταινίες).';
    case 'action_punchy':
      return 'Κοφτό, άμεσο, δυναμικό ύφος δράσης (σύντομες προτάσεις, άμεση κατανόηση σε σκηνές υψηλής ταχύτητας).';
    case 'humor_sitcom':
      return 'Κωμικό, ευρηματικό ύφος με προσαρμογή του χιούμορ και των λογοπαιγνίων στην ελληνική κουλτούρα ώστε να βγάζει γέλιο.';
    default:
      return 'Φυσική καθομιλουμένη ελληνική.';
  }
}

export function generateSystemInstructions(config: PromptConfig): string {
  const toneDesc = getToneDescription(config.tone);
  const politenessDesc =
    config.politeness === 'formal'
      ? 'Χρησιμοποίησε πληθυντικό ευγενείας όπου αρμόζει (επίσημη επικοινωνία).'
      : config.politeness === 'informal'
      ? 'Χρησιμοποίησε ενικό/ανεπίσημο τόνο (καθημερινή επαφή/φίλοι).'
      : 'Προσάρμοσε τον πληθυντικό ευγενείας ανάλογα με τη σχέση των χαρακτήρων στο κείμενο.';

  return `Είσαι κορυφαίος επαγγελματίας μεταφραστής οπτικοακουστικών μέσων (Senior Greek Audiovisual Subtitler & Localizer).
Στόχος σου είναι να μεταφράσεις τους παρακάτω αγγλικούς υπότιτλους (.srt) σε άπταιστα, φυσικά και ζωντανά Ελληνικά, τηρώντας αυστηρά τους διεθνείς κανόνες επαγγελματικού υποτιτλισμού.

ΚΡΙΣΙΜΟΙ ΚΑΝΟΝΕΣ:
1. ΑΠΟΛΥΤΗ ΔΙΑΤΗΡΗΣΗ ΧΡΟΝΙΣΜΩΝ & ΑΡΙΘΜΗΣΗΣ (Zero-drift Timings):
   - ΚΡΑΤΑ ΑΠΑΡΕΓΚΛΙΤΑ τον ακριβή αριθμό (ID) και τους ακριβείς χρονισμούς: 00:00:00,000 --> 00:00:00,000.
   - ΜΗΝ αλλάξεις ούτε ένα χιλιοστό του δευτερολέπτου. ΜΗΝ συγχωνεύσεις και ΜΗΝ παραλείψεις κανέναν υπότιτλο.
   - Ο συνολικός αριθμός υπότιτλων στην έξοδο ΠΡΕΠΕΙ να είναι ακριβώς ίσος με την είσοδο.

2. ΦΥΣΙΚΗ ΕΛΛΗΝΙΚΗ ΓΛΩΣΣΑ (Natural Idiomatic Greek):
   - ΑΠΑΓΟΡΕΥΕΤΑΙ η κατά λέξη / ρομποτική / ξύλινη μετάφραση ("μηχανικά ελληνικά").
   - Ύφος μετάφρασης: ${toneDesc}
   - Πληθυντικός/Ενικός: ${politenessDesc}
   - Μετάφρασε ιδιώματα και εκφράσεις στη φυσική τους ελληνική αντιστοιχία (π.χ. "piece of cake" -> "παιχνιδάκι", "you got it" -> "έγινε / αμέσως", "hit the road" -> "ώρα να φεύγουμε", "I didn't buy it" -> "δεν το έχαψα").

3. ΚΑΝΟΝΕΣ ΧΩΡΟΥ & ΑΝΑΓΝΩΣΙΜΟΤΗΤΑΣ:
   - Μέγιστο μήκος γραμμής: ~${config.maxCharsPerLine} χαρακτήρες.
   - Έως 2 γραμμές ανά υπότιτλο.
   - Φυσικό σπάσιμο γραμμής (line-break) ανάλογα με το συντακτικό (μην χωρίζεις άρθρο από ουσιαστικό ή ρήμα από το άμεσο αντικείμενό του).
   - Αν ο ρυθμός ομιλίας είναι υπερβολικά γρήγορος, συμπύκνωσε φυσικά το νόημα χωρίς να χάνεται η ουσία.

4. FORMAT & ΕΙΔΙΚΑ ΣΥΜΒΟΛΑ:
   - Διατήρησε HTML tags όπως <i>...</i> (πλάγια γραφή για φωνή από τηλέφωνο/ραδιόφωνο/αφήγηση) ${config.preserveTags ? 'απαράλλαχτα' : ''}.
   - Περιγραφές ήχων σε αγκύλες/παρενθέσεις ${config.preserveBrackets ? 'απόδωσέ τες στα ελληνικά (π.χ. [Μουσική], (γέλια), [χειροκροτήματα])' : ''}.

${config.customGlossary.trim() ? `5. ΕΙΔΙΚΟ ΓΛΩΣΣΑΡΙΟ / ΟΡΟΙ:\n${config.customGlossary.trim()}` : ''}

ΕΞΟΔΟΣ:
Δώσε ΜΟΝΟ το τελικό, έγκυρο κείμενο .srt. Μην προσθέσεις εισαγωγικούς χαιρετισμούς, επεξηγήσεις ή markdown block tags, ώστε να γίνει άμεση επικόλληση.`;
}

export function generateBatchPrompt(
  cues: SubtitleCue[],
  config: PromptConfig,
  chunkIndex: number,
  totalChunks: number
): { promptText: string; chunkCues: SubtitleCue[]; label: string } {
  const isChunked = config.chunkSize > 0 && cues.length > config.chunkSize;
  let chunkCues = cues;
  let label = `Όλοι οι υπότιτλοι (1 έως ${cues.length})`;

  if (isChunked) {
    const start = chunkIndex * config.chunkSize;
    const end = Math.min(start + config.chunkSize, cues.length);
    chunkCues = cues.slice(start, end);
    label = `Μέρος ${chunkIndex + 1} από ${totalChunks} (Υπότιτλοι ${start + 1} έως ${end})`;
  }

  const systemPrompt = generateSystemInstructions(config);
  const srtSnippet = cuesToSRT(chunkCues, false);

  const promptText = `${systemPrompt}

--- ΕΝΑΡΞΗ ΑΓΓΛΙΚΩΝ ΥΠΟΤΙΤΛΩΝ (${label}) ---
${srtSnippet}
--- ΤΕΛΟΣ ΑΓΓΛΙΚΩΝ ΥΠΟΤΙΤΛΩΝ ---

Παρακαλώ μετάφρασε τώρα σε φυσικά Ελληνικά, τηρώντας ακριβώς τους χρονισμούς και τη μορφή .srt.`;

  return {
    promptText,
    chunkCues,
    label,
  };
}
