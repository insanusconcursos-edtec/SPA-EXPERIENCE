import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  Trash2, 
  Loader2, 
  X, 
  AlertTriangle, 
  CheckCircle,
  Key
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../config/firebase';

interface ClientData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  createdAt: string;
}

export const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Delete modal state
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'client'));
      const querySnapshot = await getDocs(q);
      const clientsList: ClientData[] = [];
      
      for (const userDoc of querySnapshot.docs) {
        const uData = userDoc.data();
        let phone = 'N/A';
        let cpf = 'N/A';
        
        // Fetch private subcollection info
        try {
          const privateDoc = await getDoc(doc(db, 'users', userDoc.id, 'private', 'info'));
          if (privateDoc.exists()) {
            const pData = privateDoc.data();
            phone = pData.phone || 'N/A';
            const encCpf = pData.encryptedCpf;
            if (encCpf) {
              try {
                // Decode base64 to retrieve raw CPF
                const decoded = atob(encCpf);
                if (decoded.length === 11) {
                  cpf = `${decoded.slice(0, 3)}.${decoded.slice(3, 6)}.${decoded.slice(6, 9)}-${decoded.slice(9)}`;
                } else {
                  cpf = decoded;
                }
              } catch (decErr) {
                cpf = encCpf;
              }
            }
          }
        } catch (subErr) {
          console.error(`Error reading private info for ${userDoc.id}:`, subErr);
        }
        
        clientsList.push({
          uid: userDoc.id,
          name: uData.name || 'Cliente Sem Nome',
          email: uData.email || 'N/A',
          phone,
          cpf,
          createdAt: uData.createdAt ? (uData.createdAt.seconds ? new Date(uData.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A') : 'N/A'
        });
      }
      
      setClients(clientsList);
    } catch (err) {
      console.error('Error fetching client list:', err);
      setError('Falha ao buscar base de clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handlePasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`E-mail de redefinição de senha enviado com sucesso para ${email}`, 'success');
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      showToast('Falha ao solicitar redefinição de senha. Verifique o e-mail do cliente.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const uid = clientToDelete.uid;
      
      // Delete private subcollection document
      await deleteDoc(doc(db, 'users', uid, 'private', 'info'));
      
      // Delete main user document
      await deleteDoc(doc(db, 'users', uid));
      
      // Update list state instantly
      setClients(prev => prev.filter(c => c.uid !== uid));
      
      showToast(`O cadastro de ${clientToDelete.name} foi removido com sucesso.`, 'success');
      setClientToDelete(null);
    } catch (err) {
      console.error('Error deleting client document:', err);
      showToast('Falha ao remover o cadastro do cliente.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter clients locally
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.cpf.replace(/\D/g, '').includes(term) ||
      c.cpf.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Dynamic Toast System */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg border shadow-2xl transition-all animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-950/90 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />}
          <span className="text-xs font-bold font-sans tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 bg-zinc-950 border border-zinc-900 rounded-lg flex items-center justify-center text-[#D4AF37]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-light text-zinc-100 uppercase tracking-widest font-serif-luxury">Base de Clientes Cadastrados</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Gestão de acessos e perfis</p>
          </div>
        </div>

        {/* Search Input bar */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900/80 rounded-lg pl-9 pr-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]/50 font-sans"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Mapeando clientes de luxo...</span>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-6 text-center text-red-300 text-xs font-semibold">
          {error}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl py-16 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
          Nenhum cliente registrado na base.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950/30">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/80 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">CPF / Contato</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {filteredClients.map((client) => (
                  <tr key={client.uid} className="hover:bg-zinc-900/20 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-black text-[#D4AF37]">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-zinc-200">{client.name}</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5">{client.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                        {client.cpf}
                      </span>
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Phone className="h-3.5 w-3.5 text-zinc-500" />
                        {client.phone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        {client.createdAt}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handlePasswordReset(client.email)}
                          className="inline-flex items-center gap-1.5 rounded bg-zinc-900 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] transition-all"
                          title="Redefinir Senha do Cliente"
                        >
                          <Key className="h-3 w-3" />
                          <span>Redefinir Senha</span>
                        </button>
                        <button
                          onClick={() => setClientToDelete(client)}
                          className="inline-flex items-center justify-center rounded bg-red-950/20 border border-red-900/30 hover:bg-red-500 hover:text-black hover:border-red-500 p-2 text-red-400 transition-all"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-zinc-950 border border-red-900/50 p-6 sm:p-8 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setClientToDelete(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 animate-pulse" />
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-red-400">Atenção! Confirmação Requerida</h3>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Deseja excluir permanentemente o cadastro de <strong className="text-white">{clientToDelete.name}</strong>? 
              <br /><br />
              Esta ação apagará todos os dados do banco e liberará o CPF/E-mail para novos cadastros públicos. Esta ação é irreversível.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-black bg-red-500 hover:bg-red-600 transition-all flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-black" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Excluir Cadastro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
