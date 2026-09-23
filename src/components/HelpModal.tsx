import React from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, ExternalLink, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Οδηγός Χρήσης Google AI Studio Chat</h3>
              <p className="text-xs text-slate-400">
                Πώς να μεταφράζετε υπότιτλους δωρεάν, με ακρίβεια χιλιοστού και φυσική γλώσσα
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Γιατί μέσω Google AI Studio Chat και όχι API;</span>
            </div>
            <p className="text-slate-300">
              Το <strong>Google AI Studio Chat</strong> (aistudio.google.com) προσφέρει εντελώς δωρεάν πρόσβαση στα κορυφαία μοντέλα της Google (Gemini 1.5 Pro & Flash) με παράθυρο περιβάλλοντος 1+ εκατομμυρίου tokens! Έτσι μεταφράζετε ολόκληρες ταινίες χωρίς χρεώσεις, χωρίς συνδρομές και χωρίς όρια κλειδιών API.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-white text-sm">Τα 4 Απλά Βήματα:</h4>
            
            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <strong className="text-white">Φόρτωση Αρχείου .SRT:</strong> Σύρετε το αγγλικό αρχείο υποτίτλων ή επικολλήστε το κείμενο. Το SubGreek Studio αναλύει τους χρονισμούς και τις ατάκες.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <strong className="text-white">Αντιγραφή Ειδικού Prompt:</strong> Επιλέγετε το ύφος (π.χ. Φυσική Καθομιλουμένη, Αργκό, Κωμωδία) και πατάτε «Αντιγραφή Prompt». Περιέχει εξειδικευμένους κανόνες υποτιτλισμού που αποτρέπουν τις μηχανικές μεταφράσεις.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                <strong className="text-white">Επικόλληση στο Google AI Studio Chat:</strong> Ανοίγετε το{' '}
                <a
                  href="https://aistudio.google.com/prompts/new_chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline inline-flex items-center gap-1"
                >
                  aistudio.google.com <ExternalLink className="w-3 h-3" />
                </a>
                , κάνετε επικόλληση (Ctrl+V) και πατάτε Run.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">4</span>
              <div>
                <strong className="text-white">Εισαγωγή & Έξυπνο Auto-Repair:</strong> Αντιγράφετε την απάντηση και την επικολλάτε στο Βήμα 3. Ακόμα κι αν το AI πείραξε κατά λάθος κάποιο κόμμα στο timestamp, ο μηχανισμός μας ανακτά 100% τους αρχικούς χρονισμούς!
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white">💡 Συμβουλές Υποτιτλιστή:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>
                <strong>Όριο Χαρακτήρων:</strong> Οι υπότιτλοι στην οθόνη δεν πρέπει να ξεπερνούν τους 38-40 χαρακτήρες ανά γραμμή. Ο editor μας επισημαίνει με κίτρινο τις γραμμές που χρειάζονται σπάσιμο με Enter.
              </li>
              <li>
                <strong>Smart TVs & Ελληνικά:</strong> Αν η τηλεόρασή σας εμφανίζει σύμβολα ή ερωτηματικά αντί για ελληνικά, επιλέξτε στην εξαγωγή την επιλογή <em>«SRT με UTF-8 BOM»</em>.
              </li>
              <li>
                <strong>Έλεγχος με Video:</strong> Μπορείτε να φορτώσετε απευθείας το τοπικό αρχείο της ταινίας σας (MP4/MKV) στο Step 4 για να ελέγξετε τον συγχρονισμό live!
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold cursor-pointer"
          >
            Εντάξει, κατάλαβα!
          </button>
        </div>
      </div>
    </div>
  );
};
