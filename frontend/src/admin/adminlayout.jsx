import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./admin.css";
import Auth from '../Auth'; // Pastikan path ini benar

// Komponen Popup
function Popup({ message, onClose }) {
  const isSuccess = !message.toLowerCase().includes("gagal");
  return (
    <div className="popup-overlay">
      <div className={`popup-box ${isSuccess ? "success" : "error"}`}>
        <div className="popup-header">
          <span className="popup-icon">{isSuccess ? "✔️" : "❌"}</span>
          <h2>{isSuccess ? "Sukses" : "Gagal"}</h2>
        </div>
        <p className="popup-message">{message}</p>
        <button className="popup-btn" onClick={onClose}>Oke</button>
      </div>
    </div>
  );
}

// Komponen utama Dashboard Admin
export default function AdminDashboard() {
  // State yang berhubungan dengan UI & Data Dashboard
  const [popupMessage, setPopupMessage] = useState("");
  const [session, setSession] = useState(undefined); // Mulai dengan undefined untuk loading state awal
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("berita");

  const [berita, setBerita] = useState([]);
  const [kontenUser, setKontenUser] = useState([]);
  const [judul, setJudul] = useState("");
  const [konten, setKonten] = useState("");
  const [kategori, setKategori] = useState("nasional");
  const [gambarFile, setGambarFile] = useState(null);
  const [editBeritaId, setEditBeritaId] = useState(null);
  const [imageCredit, setImageCredit] = useState("");
  
  const [showRevisiModal, setShowRevisiModal] = useState(false);
  const [revisiId, setRevisiId] = useState(null);
  const [revisiCatatan, setRevisiCatatan] = useState("");
  
  const [users, setUsers] = useState([]);
  const [klasemen, setKlasemen] = useState([]);
  const [tim, setTim] = useState("");
  const [poin, setPoin] = useState("");
  const [liga, setLiga] = useState("");
  const [editKlasemenId, setEditKlasemenId] = useState(null);
  const [daftarLiga, setDaftarLiga] = useState([]);
  const [ligaBaru, setLigaBaru] = useState("");
  
  const [previewPost, setPreviewPost] = useState(null);
// Di dalam file Auth.jsx

 
  // --- Penanganan Session & Logout ---
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN') {
          setSession(session);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
        setProfile(null);
        return;
    };

    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data);
      });
  }, [session]);
  
  // --- FETCH DATA ---
  useEffect(() => {
    if (session && profile?.role === 'admin') {
      fetchBerita();
      fetchUsers();
      fetchKlasemen();
      fetchLiga();
    }
  }, [session, profile]);

  const fetchBerita = async () => {
    const { data, error } = await supabase.from("berita").select("*, profiles(name)").order("created_at", { ascending: false });
    if (error) { setPopupMessage("Gagal memuat data berita: " + error.message); return; }
    if (data) {
      setBerita(data);
      setKontenUser(data);
    }
  };
  const fetchUsers = async () => { const { data } = await supabase.from("profiles").select("*"); if (data) setUsers(data); };
  const fetchKlasemen = async () => { const { data } = await supabase.from("klasemen").select("*").order("poin", { ascending: false }); if (data) setKlasemen(data); };
  const fetchLiga = async () => { const { data } = await supabase.from("klasemen").select("liga"); if (data) { const uniqueLiga = [...new Set(data.map((item) => item.liga))]; setDaftarLiga(uniqueLiga.map((l, i) => ({ id: i, nama: l }))); if (!liga && uniqueLiga.length) setLiga(uniqueLiga[0]); } };
  
  // --- FUNGSI AKSI ---
  const approveKonten = async (id) => {
    try {
      const { error } = await supabase.from("berita").update({ status: "approved", revisi_catatan: null }).eq("id", id);
      if (error) throw error;
      setPopupMessage("Konten berhasil di-approve!");
      fetchBerita();
    } catch (error) {
      setPopupMessage("Gagal approve konten: " + error.message);
    }
  };

  const openRevisiModal = (id, existingCatatan = "") => { setRevisiId(id); setRevisiCatatan(existingCatatan); setShowRevisiModal(true); };
  const closeRevisiModal = () => { setRevisiId(null); setRevisiCatatan(""); setShowRevisiModal(false); };
  
  const submitRevisi = async () => {
    if (!revisiCatatan.trim()) return setPopupMessage("Catatan revisi tidak boleh kosong!");
    try {
      const { error } = await supabase.from("berita").update({ status: "revisi", revisi_catatan: revisiCatatan }).eq("id", revisiId);
      if (error) throw error;
      setPopupMessage("Catatan revisi berhasil dikirim!");
      fetchBerita();
      closeRevisiModal();
    } catch (error) {
      setPopupMessage("Gagal mengirim revisi: " + error.message);
    }
  };

  const toggleBlock = async (id, isBlocked) => {
    const confirmAction = window.confirm(`${isBlocked ? "Unblock" : "Block"} akun ini?`);
    if (!confirmAction) return;
    try {
      const { error } = await supabase.from("profiles").update({ blocked: !isBlocked }).eq("id", id);
      if (error) throw error;
      setPopupMessage(`Akun berhasil di-${isBlocked ? 'unblock' : 'block'}.`);
      fetchUsers();
    } catch (error) {
      setPopupMessage("Gagal mengubah status akun: " + error.message);
    }
  };

  const toggleAdminRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const actionText = newRole === 'admin' ? 'menjadikan pengguna ini Admin' : 'menghapus status Admin pengguna ini';
    
    if (!window.confirm(`Apakah Anda yakin ingin ${actionText}?`)) return;

    try {
      const { error } = await supabase.rpc('set_user_role', {
        user_id: userId,
        new_role: newRole
      });
      if (error) throw error;
      setPopupMessage("Peran pengguna berhasil diupdate!");
      fetchUsers();
    } catch (error) {
      setPopupMessage("Gagal mengupdate peran pengguna: " + error.message);
    }
  };

  const submitKlasemen = async (e) => { e.preventDefault(); /* ... */ };
  const tambahLiga = () => { /* ... */ };

  const resetFormBerita = () => {
    setJudul(""); setKonten(""); setKategori("nasional"); setGambarFile(null); setEditBeritaId(null); setImageCredit("");
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  const submitBerita = async (e) => {
    e.preventDefault();
    if (!judul.trim() || !konten.trim()) return setPopupMessage("Judul dan Konten tidak boleh kosong!");
    try {
      let gambarUrl = null;
      if (gambarFile) {
        const fileName = `${Date.now()}_${gambarFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("images").upload(fileName, gambarFile);
        if (uploadError) throw new Error("Gagal mengunggah gambar: " + uploadError.message);
        gambarUrl = supabase.storage.from("images").getPublicUrl(uploadData.path).data.publicUrl;
      }
      const dataToSubmit = { judul, konten, kategori, image_credit: imageCredit, ...(gambarFile && { gambar: gambarUrl }) };
      let dbResponse;
      if (editBeritaId) {
        dbResponse = await supabase.from("berita").update(dataToSubmit).eq("id", editBeritaId);
      } else {
        dbResponse = await supabase.from("berita").insert([{ ...dataToSubmit, status: "approved", author_id: session.user.id, author: profile?.name || "Admin" }]);
      }
      if (dbResponse.error) throw new Error("Gagal menyimpan data: " + dbResponse.error.message);
      setPopupMessage(`Berita berhasil ${editBeritaId ? 'diupdate' : 'ditambahkan'}!`);
      resetFormBerita();
      fetchBerita();
    } catch (error) {
      setPopupMessage(error.message);
    }
  };

  const deleteBerita = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus berita ini secara permanen?")) return;
    try {
      const { error } = await supabase.from("berita").delete().eq("id", id);
      if (error) throw error;
      setPopupMessage("Berita berhasil dihapus!");
      fetchBerita();
    } catch (error) {
      setPopupMessage("Gagal menghapus berita: " + error.message);
    }
  };

  // --- RENDER LOGIC ---
  if (session === undefined) {
      return <div className="loading-page">Loading...</div>;
  }
  
  if (!session) {
    return <Auth mode="admin" onLoginSuccess={setSession} />;
  }
  
  if (!profile) {
    return <div className="loading-page">Memuat data pengguna...</div>;
  }
  
  if (profile.role !== 'admin') {
    return (
      <div className="access-denied-page">
        <h2>Hayooo mau ngehack yhh </h2>
        <p>Anda tidak memiliki hak untuk mengakses halaman ini.</p>
        <button onClick={logout} className="btn-logout">Logout</button>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2 className="logo">Admin Panel</h2>
        <ul>{["berita", "konten", "users", "klasemen"].map((t) => ( <li key={t}> <a href="#" className={activeTab === t ? "active" : ""} onClick={(e) => { e.preventDefault(); setActiveTab(t); }} > {t[0].toUpperCase() + t.slice(1)} </a> </li> ))} </ul>
        <button onClick={logout} className="btn-logout"> Logout </button>
      </aside>

      <main className="content">
        {activeTab === "berita" && (
          <div>
            <h1>Kelola Berita</h1>
            <form onSubmit={submitBerita} className="form-box">
              <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul" required />
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}> <option value="nasional">Nasional</option> <option value="internasional">Internasional</option> </select>
              <textarea value={konten} onChange={(e) => setKonten(e.target.value)} placeholder="Isi berita..." rows={8} required />
              <input type="file" accept="image/*" onChange={(e) => setGambarFile(e.target.files[0])} />
              <input type="text" value={imageCredit} onChange={(e) => setImageCredit(e.target.value)} placeholder="Credit Gambar (opsional)" />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="btn-primary"> {editBeritaId ? "Update" : "Tambah"} Berita </button>
                {editBeritaId && <button type="button" className="btn-cancel" onClick={resetFormBerita}>Batal Edit</button>}
              </div>
            </form>
            <table className="table-modern">
              <thead> <tr> <th>Judul</th> <th>Author</th> <th>Status</th> <th>Action</th> </tr> </thead>
              <tbody>
                {berita.map((b) => (
                  <tr key={b.id}>
                    <td>{b.judul}</td>
                    <td>{b.profiles?.name || b.author ||'User Dihapus'}</td>
                    <td><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                    <td className="action-buttons">
                      <button onClick={() => { setJudul(b.judul); setKonten(b.konten); setKategori(b.kategori); setEditBeritaId(b.id); setImageCredit(b.image_credit || ""); window.scrollTo(0,0); }} className="btn-edit">Edit</button>
                      <button onClick={() => deleteBerita(b.id)} className="btn-delete">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === "konten" && ( 
          <div> 
            <h1>Konten Kiriman User</h1> 
            <table className="table-modern table-hover">
              <thead> <tr> <th>Judul</th> <th>Author</th> <th>Status</th> <th>Catatan Revisi</th> </tr> </thead> 
              <tbody> 
                {kontenUser.map((c) => (
                  <tr key={c.id} onClick={() => setPreviewPost(c)} style={{ cursor: 'pointer' }}> 
                    <td>{c.judul}</td> 
                    <td>{c.profiles?.name || c.author || 'User Dihapus'}</td> 
                    <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td> 
                    <td>{c.revisi_catatan || "-"}</td> 
                  </tr> 
                ))} 
              </tbody> 
            </table> 
          </div> 
        )}

        {activeTab === "users" && ( 
          <div> 
            <h1>Kelola Users</h1> 
            <table className="table-modern"> 
              <thead> <tr> <th>Email</th> <th>Name</th> <th>Role</th> <th>Status</th> <th style={{width: '280px'}}>Aksi</th> </tr> </thead> 
              <tbody> 
                {users.map((u) => ( 
                  <tr key={u.id}> 
                    <td>{u.email}</td> 
                    <td>{u.name || "-"}</td> 
                    <td>{u.role}</td> 
                    <td>{u.blocked ? "Blocked" : "Active"}</td> 
                    <td className="action-buttons"> 
                      <button className={u.blocked ? "btn-unblock" : "btn-block"} onClick={() => toggleBlock(u.id, u.blocked)}> {u.blocked ? "Unblock" : "Block"} </button>
                      {u.id !== session.user.id && (
                        <button
                          className={u.role === 'admin' ? 'btn-delete' : 'btn-approve'}
                          onClick={() => toggleAdminRole(u.id, u.role)}
                        >
                          {u.role === 'admin' ? 'Hapus Admin' : 'Jadikan Admin'}
                        </button>
                      )}
                    </td> 
                  </tr> 
                ))} 
              </tbody> 
            </table> 
          </div> 
        )}

        {activeTab === "klasemen" && ( <div> <h1>Kelola Klasemen</h1> <form onSubmit={submitKlasemen} className="form-box"> <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Nama Tim" required /> <input type="number" value={poin} onChange={(e) => setPoin(e.target.value)} placeholder="Poin" required /> <select value={liga} onChange={(e) => setLiga(e.target.value)}> <option value="">-- Pilih Liga --</option> {daftarLiga.map((l) => ( <option key={l.id} value={l.nama}>{l.nama}</option> ))} </select> <div className="input-liga-baru"> <input value={ligaBaru} onChange={(e) => setLigaBaru(e.target.value)} placeholder="Tambah liga baru..." /> <button type="button" className="btn-primary" onClick={tambahLiga}>+ Liga</button> </div> <button type="submit" className="btn-primary"> {editKlasemenId ? "Update" : "Tambah"} Klasemen </button> </form> <table className="table-modern"> <thead> <tr> <th>Tim</th> <th>Poin</th> <th>Liga</th> <th>Aksi</th> </tr> </thead> <tbody> {klasemen.map((k) => ( <tr key={k.id}> <td>{k.tim}</td> <td>{k.poin}</td> <td>{k.liga}</td> <td className="action-buttons"> <button className="btn-edit" onClick={() => { setTim(k.tim); setPoin(k.poin); setLiga(k.liga); setEditKlasemenId(k.id); }}>Edit</button> <button className="btn-delete" onClick={() => supabase.from("klasemen").delete().eq("id", k.id).then(fetchKlasemen)}>Hapus</button> </td> </tr> ))} </tbody> </table> </div> )}
      </main>

      {showRevisiModal && ( <div className="modal-overlay"> <div className="modal-box"> <h2>Masukkan Catatan Revisi</h2> <textarea value={revisiCatatan} onChange={(e) => setRevisiCatatan(e.target.value)} rows={5} placeholder="Tulis catatan revisi..." /> <div className="modal-buttons"> <button className="btn-cancel" onClick={closeRevisiModal}>Batal</button> <button className="btn-primary" onClick={submitRevisi}>Tambahkan Revisi</button> </div> </div> </div> )}
      
      {previewPost && (
        <div className="modal-overlay">
          <div className="modal-box preview-modal">
            <button className="modal-close-btn" onClick={() => setPreviewPost(null)}>&times;</button>
            <h2>Pratinjau Tulisan</h2>
            <div className="preview-scroll-container"> 
              {previewPost.gambar && <img src={previewPost.gambar} alt={previewPost.judul} className="preview-image" />}
              <h3>{previewPost.judul}</h3>
              <p className="preview-author">Oleh: {previewPost.author || 'Unknown'} | Kategori: {previewPost.kategori}</p>
              <div className="preview-content">{previewPost.konten}</div>
            </div>
            <div className="modal-buttons">
              {previewPost.status !== 'approved' && <button className="btn-approve" onClick={() => { approveKonten(previewPost.id); setPreviewPost(null); }}>✔️ Approve</button>}
              {previewPost.status !== 'revisi' && <button className="btn-revisi" onClick={() => { openRevisiModal(previewPost.id, previewPost.revisi_catatan); setPreviewPost(null); }}>✏️ Revisi</button>}
              <button className="btn-cancel" onClick={() => setPreviewPost(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
      
      {popupMessage && <Popup message={popupMessage} onClose={() => setPopupMessage("")} />}
    </div>
  );
}





