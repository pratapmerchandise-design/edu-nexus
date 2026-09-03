import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface CreatePollModalProps {
  onClose: () => void;
  onSubmit: (question: string, options: string[], multipleAnswers: boolean) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleAnswers, setMultipleAnswers] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleChangeOption = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOpts = options.filter(o => o.trim() !== '');
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }
    if (validOpts.length < 2) {
      alert("Please provide at least 2 options");
      return;
    }
    onSubmit(question.trim(), validOpts, multipleAnswers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <h2 className="text-sm font-bold text-foreground">Create Poll</h2>
          <button onClick={onClose} className="p-1 rounded-full text-muted-foreground hover:bg-border/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ask a question</label>
            <input
              type="text"
              placeholder="e.g., What time should we meet?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => handleChangeOption(i, e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {options.length < 6 && (
              <button 
                type="button" 
                onClick={handleAddOption}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors pt-2"
              >
                <Plus className="w-4 h-4" /> Add Option
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Allow multiple answers</p>
              <p className="text-[10px] text-muted-foreground">People can select more than one option</p>
            </div>
            <button
              type="button"
              onClick={() => setMultipleAnswers(!multipleAnswers)}
              className={`w-12 h-6 rounded-full transition-colors relative ${multipleAnswers ? 'bg-primary' : 'bg-secondary border border-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${multipleAnswers ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <CheckCircle2 className="w-5 h-5" /> Send Poll
          </button>
        </form>
      </div>
    </div>
  );
};
