import React from 'react';
export function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><section role="dialog" aria-label="Οδηγίες χρήσης" className="panel max-w-2xl space-y-4">
    <h2 className="text-lg font-semibold">Μετάφραση με το Google AI Studio Chat</h2>
    <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-300">
      <li>Φορτώστε το αρχικό αγγλικό SRT. Η εφαρμογή κρατά την αρίθμηση και τους χρόνους.</li>
      <li>Στο Βήμα 2 επιλέξτε μέρος και ύφος. Αντιγράψτε το prompt στο AI Studio. Η απάντηση περιέχει JSON με αναγνωριστικά και μεταφράσεις.</li>
      <li>Στο Βήμα 3 επικολλήστε ολόκληρη την απάντηση, πατήστε Έλεγχος και έπειτα Εφαρμογή. Οι υπάρχουσες μεταφράσεις διατηρούνται εκτός αν επιλέξετε αντικατάσταση.</li>
      <li>Για ελλείψεις ή προειδοποιήσεις, χρησιμοποιήστε Prompt διόρθωσης. Συνεχίστε με το επόμενο μέρος στο Βήμα 2.</li>
      <li>Ελέγξτε τη μετάφραση στον Editor και με το βίντεο. Οι προτάσεις από παλιό SRT χρειάζονται πάντα έλεγχο αντιστοίχισης.</li>
    </ol>
    <p className="text-sm">Η πρόοδος αποθηκεύεται στον τρέχοντα browser. Χρησιμοποιήστε Λήψη εργασίας για ανεξάρτητο αντίγραφο και Φόρτωση εργασίας για επαναφορά. Το βίντεο επιλέγεται ξανά μετά από ανανέωση.</p>
    <p className="text-sm text-amber-300">Οι τεχνικοί έλεγχοι δεν πιστοποιούν την ποιότητα της μετάφρασης. Μπορείτε να εξαγάγετε πρόχειρο SRT με σαφή επισήμανση των κενών. Η χρήση του AI Studio υπόκειται στους όρους και στα όρια του παρόχου.</p>
    <button className="primary" onClick={onClose}>Κλείσιμο οδηγιών</button>
  </section></div>;
}
