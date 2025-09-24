import { useEffect, useState, useRef } from "react";
import "./index.css";
import Profil from "./profiles";
import NewsDetail from "./NewsDetail";
import AuthorProfile from "./AuthorProfile";
import { supabase } from "./supabaseClient";
import MojokLogo from './assets/Kampiun-Logo.png';
import Footer from './Footer';
import Auth from './Auth'; // Impor komponen Auth

// Fungsi untuk membaca URL dan menentukan state awal
const getInitialStateFromUrl = () => {
  const path = window.location.pathname;
  const pathParts = path.split("/").filter(Boolean);
  const [pageName, id] = pathParts;

  if (pageName === "author" && id) {
    return { page: "authorProfile", selectedAuthorId: id, selectedNewsId: null };
  }
  if (pageName === "news" && id) {
    return { page: "newsdetail", selectedAuthorId: null, selectedNewsId: id };
  }
  // Tambahkan 'reset-password' ke daftar rute yang valid
  if (pageName && ["nasional", "internasional", "profil", "unggah", "tulisan-saya", "login", "reset-password"].includes(pageName)) {
    return { page: pageName, selectedAuthorId: null, selectedNewsId: null };
  }
  return { page: "home", selectedAuthorId: null, selectedNewsId: null };
};

export default function App() {
  // === STATE APLIKASI ===
  const [page, setPage] = useState(() => getInitialStateFromUrl().page);
  const [selectedNewsId, setSelectedNewsId] = useState(() => getInitialStateFromUrl().selectedNewsId);
  const [selectedAuthorId, setSelectedAuthorId] = useState(() => getInitialStateFromUrl().selectedAuthorId);

  const [data, setData] = useState({ nasional: [], internasional: [], klasemen: [], headlines: [], menu: [] });
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [popupMessage, setPopupMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], news: [] });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());

  // --- STATE UNTUK FITUR EDIT REVISI ---
  const [editingPost, setEditingPost] = useState(null);
  const [uploadJudul, setUploadJudul] = useState("");
  const [uploadIsi, setUploadIsi] = useState("");
  const [uploadKategori, setUploadKategori] = useState("nasional");
  const [uploadGambarFile, setUploadGambarFile] = useState(null);

  // Fungsi reset form unggah
  const resetUploadForm = () => {
    setEditingPost(null);
    setUploadJudul("");
    setUploadIsi("");
    setUploadKategori("nasional");
    setUploadGambarFile(null);
    const fileInput = document.querySelector('input[name="gambar"]');
    if (fileInput) fileInput.value = "";
  };
  
  // Efek untuk mengisi form saat 'editingPost' diatur
  useEffect(() => {
    if (page === 'unggah' && editingPost) {
      setUploadJudul(editingPost.judul);
      setUploadIsi(editingPost.konten);
      setUploadKategori(editingPost.kategori);
    } else {
      if (page !== 'unggah' && editingPost) {
        resetUploadForm();
      }
    }
  }, [page, editingPost]);

  // Efek untuk routing / URL
  useEffect(() => {
    const currentState = { page, selectedNewsId, selectedAuthorId };
    let newPath = "/";
    if (page === 'authorProfile' && selectedAuthorId) newPath = `/author/${selectedAuthorId}`;
    else if (page === "newsdetail" && selectedNewsId) newPath = `/news/${selectedNewsId}`;
    else if (page !== "home") newPath = `/${page}`;
    if (window.location.pathname !== newPath) window.history.pushState(currentState, "", newPath);
  }, [page, selectedNewsId, selectedAuthorId]);

  // Efek untuk tombol back/forward browser
  useEffect(() => {
    const handleLocationChange = () => {
      const newState = getInitialStateFromUrl();
      setPage(newState.page);
      setSelectedNewsId(newState.selectedNewsId);
      setSelectedAuthorId(newState.selectedAuthorId);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // --- FUNGSI-FUNGSI UTAMA ---
  const handleNavigation = (targetPage) => {
    setSelectedAuthorId(null);
    setSelectedNewsId(null);
    if (page === 'unggah' && editingPost) {
      resetUploadForm();
    }
    setPage(targetPage);
  };
  
  // Fungsi untuk update password (digunakan oleh halaman reset-password)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const newPassword = e.target.password.value;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPopupMessage("Gagal reset password: " + error.message);
    } else {
      setPopupMessage("Password berhasil direset! Silakan login dengan password baru Anda.");
      setPage("login");
    }
  };

  // Listener otentikasi yang sudah diperbarui
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPage('reset-password'); 
        } else {
          setSession(session);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Efek untuk mengambil data profil user
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data, error }) => !error && setProfile(data));
  }, [session]);

  // Efek untuk mengambil data berita, klasemen, dll.
  useEffect(() => {
    (async () => {
      const fetchKlasemen = () => supabase.from("klasemen").select("*").order("poin", { ascending: false });
      const fetchMenu = () => supabase.from("menu").select("*").order("urutan", { ascending: true });
      const fetchBerita = () => supabase.from("berita").select("*").eq('status', 'approved').order("created_at", { ascending: false });
      const [berita, klasemen, menu] = await Promise.all([ fetchBerita(), fetchKlasemen(), fetchMenu() ]);
      const news = berita.data || [];
      setData({
        nasional: news.filter((b) => b.kategori === "nasional"),
        internasional: news.filter((b) => b.kategori === "internasional"),
        klasemen: klasemen.data || [],
        headlines: [...news].sort((a, b) => (b.views || 0) - (a.views || 0) || new Date(b.created_at) - new Date(a.created_at)).slice(0, 10),
        menu: menu.data || [],
      });
    })();
  }, [session]);

  const handleFollow = async (targetId) => {
    if (!session?.user) return setPopupMessage("Anda harus login untuk mengikuti pengguna.");
    const { error } = await supabase.from("followers").insert({ follower_id: session.user.id, following_id: targetId });
    if (!error) setFollowingIds((prev) => new Set(prev).add(targetId));
    else setPopupMessage("Gagal mengikuti: " + error.message);
  };

  const handleUnfollow = async (targetId) => {
    if (!session?.user) return;
    const { error } = await supabase.from("followers").delete().eq("follower_id", session.user.id).eq("following_id", targetId);
    if (!error) {
      setFollowingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetId);
        return newSet;
      });
    } else setPopupMessage("Gagal berhenti mengikuti: " + error.message);
  };

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!session?.user) return;
      const { data, error } = await supabase.from("followers").select("following_id").eq("follower_id", session.user.id);
      if (!error && data) setFollowingIds(new Set(data.map((item) => item.following_id)));
    };
    fetchFollowing();
  }, [session]);

  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim() === "") return setSearchResults({ users: [], news: [] });
      setLoadingSearch(true);
      const searchUsers = supabase.from("profiles").select("id, name, avatar_url").ilike("name", `%${searchQuery}%`).neq("id", session?.user?.id).limit(5);
      const searchNews = supabase.from("berita").select("id, judul, kategori, gambar").eq('status', 'approved').ilike("judul", `%${searchQuery}%`).limit(5);
      const [usersResult, newsResult] = await Promise.all([searchUsers, searchNews]);
      setSearchResults({ users: usersResult.data || [], news: newsResult.data || [] });
      setLoadingSearch(false);
    };
    const debounceTimeout = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, session]);
  
  const navigateToNewsDetail = (newsId) => {
    setSelectedAuthorId(null);
    setSelectedNewsId(newsId);
    setPage("newsdetail");
    setSearchQuery("");
  };

  useEffect(() => {
    if (page === "tulisan-saya" && session?.user) {
      supabase.from("berita").select("*").eq("author_id", session.user.id).order("created_at", { ascending: false }).then(({ data, error }) => !error && setMyPosts(data || []));
    }
  }, [page, session]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setPage("home");
  };
  
  let currentPage = page;
  if (selectedAuthorId) { currentPage = 'authorProfile'; }
  const navProps = { onNavigate: handleNavigation, logout, session, profile, searchQuery, setSearchQuery, searchResults, isSearchFocused, setIsSearchFocused, loadingSearch, handleFollow, handleUnfollow, followingIds, 
    setSelectedAuthorId: (id) => {
        setPage('authorProfile');
        setSelectedAuthorId(id);
    }, 
    navigateToNewsDetail };

  // --- RENDER LOGIC ---
  const renderPage = () => {
    switch(currentPage) {
        case 'authorProfile':
            return ( <main className="container"> <AuthorProfile authorId={selectedAuthorId} onBack={() => { setSelectedAuthorId(null); setPage("home"); }} onSelectNews={(id) => { setSelectedNewsId(id); setPage("newsdetail"); }} currentUser={session?.user} followingIds={followingIds} handleFollow={handleFollow} handleUnfollow={handleUnfollow} /> </main> );
        case 'newsdetail':
             if (!selectedNewsId) return null;
             return ( <main className="container"> <NewsDetail id={selectedNewsId} onBack={() => { setSelectedNewsId(null); setPage("home"); }} onSelect={(value) => { if (typeof value === "string" && value.startsWith("page:")) { const targetPage = value.replace("page:", ""); setSelectedNewsId(null); setPage(targetPage); } else { setSelectedNewsId(value); setPage("newsdetail"); } }} onSelectAuthor={(authorId) => { setSelectedAuthorId(authorId); setPage('authorProfile'); }} session={session} user={session?.user} onShowPopup={(msg) => setPopupMessage(msg)} /> </main> );
        
        case "login":
            if (session) return null;
            return (
              <Auth 
                mode="user" 
                onLoginSuccess={(session) => {
                  setSession(session);
                  setPage("home");
                }} 
              />
            );

        case "profil": 
            return ( <main className="container"> <div style={{ paddingTop: '1rem', marginBottom: '1rem' }}> <button className="back-btn" onClick={() => setPage("home")}> ← Kembali </button> </div> <Profil /> </main> );
        
        case "unggah": 
             return ( 
                 <main className="container">
                     <div style={{ paddingTop: '1rem', marginBottom: '1rem' }}>
                         <button className="back-btn" onClick={() => { setPage("tulisan-saya"); resetUploadForm(); }}> ← Kembali ke Tulisan Saya </button>
                     </div>
                     <div className="form-box"> 
                         <h2>{editingPost ? "Revisi Tulisan Anda" : "Unggah Tulisan Baru"}</h2> 
                         {editingPost && (
                            <div style={{ marginBottom: '1rem', padding: '12px', backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', color: '#664d03', fontSize: '14px' }}>
                                {editingPost.revisi_catatan ? (
                                <>
                                    <strong>Catatan Revisi dari Admin:</strong>
                                    <em style={{ display: 'block', marginTop: '4px' }}>"{editingPost.revisi_catatan}"</em>
                                </>
                                ) : (
                                <>
                                    <strong>Status: Perlu Revisi.</strong>
                                    <em style={{ display: 'block', marginTop: '4px' }}>Admin meminta Anda untuk memeriksa kembali tulisan ini. Silakan lakukan perbaikan yang diperlukan dan kirim ulang.</em>
                                </>
                                )}
                            </div>
                         )}
                         <form onSubmit={async (e) => { 
                             e.preventDefault(); 
                             if (profile?.blocked) { setPopupMessage( "Anda diblokir." ); return; } 
                             if (!profile?.name) { setPopupMessage("Profil belum lengkap"); return; }
                             
                             let finalImageUrl = editingPost ? editingPost.gambar : null;
                             if (uploadGambarFile) {
                               const fileExt = uploadGambarFile.name.split(".").pop();
                               const fileName = `${Date.now()}_${fileExt}`;
                               const { error: uploadError } = await supabase.storage.from("images").upload(fileName, uploadGambarFile);
                               if (uploadError) { setPopupMessage( "Gagal upload gambar: " + uploadError.message ); return; }
                               finalImageUrl = supabase.storage.from("images").getPublicUrl(fileName).data.publicUrl;
                             }

                             let error;
                             if (editingPost) {
                               const { error: updateError } = await supabase.from("berita").update({
                                 judul: uploadJudul,
                                 konten: uploadIsi,
                                 kategori: uploadKategori,
                                 gambar: finalImageUrl,
                                 status: 'pending',
                                 revisi_catatan: null
                               }).eq("id", editingPost.id);
                               error = updateError;
                             } else {
                               const { error: insertError } = await supabase.from("berita").insert([{ 
                                 judul: uploadJudul, 
                                 konten: uploadIsi, 
                                 kategori: uploadKategori, 
                                 gambar: finalImageUrl, 
                                 author_id: session.user.id, 
                                 author: profile.name 
                               }]);
                               error = insertError;
                             }
                             
                            // ...
if (!error) {
    const successMessage = editingPost 
      ? "Revisi berhasil dikirim! Sedang ditinjau ulang oleh admin. Grab your coffee ☕" 
      : "Berhasil! Tulisanmu sedang ditinjau admin. Grab your coffee ☕";
      
    setPopupMessage(successMessage);
    resetUploadForm();
    setPage("tulisan-saya"); 
}
// ...
                         }} > 
                             <input name="judul" placeholder="Judul" value={uploadJudul} onChange={e => setUploadJudul(e.target.value)} required /> 
                             <select name="kategori" value={uploadKategori} onChange={e => setUploadKategori(e.target.value)} required> <option value="">-- Pilih Kategori --</option><option value="nasional">Nasional</option><option value="internasional">Internasional</option> </select> 
                             <textarea name="isi" placeholder="Isi tulisan" value={uploadIsi} onChange={e => setUploadIsi(e.target.value)} rows="10" required /> 
                             <input type="file" name="gambar" accept="image/*" onChange={e => setUploadGambarFile(e.target.files[0])} /> 
                             <button type="submit">{editingPost ? "Kirim Ulang Revisi" : "Unggah"}</button> 
                         </form> 
                     </div>
                 </main> 
             );

      case "tulisan-saya":
        return (
          <main className="container">
            <div style={{ paddingTop: '1rem', marginBottom: '1rem' }}>
              <button className="back-btn" onClick={() => setPage("home")}> ← Kembali </button>
            </div>
            <h2>Tulisan Saya</h2>
            <div className="berita-list">
              {myPosts.length === 0 ? (
                <p>Belum ada tulisan.</p>
              ) : (
                myPosts.map((b) => {
                  let statusInfo = { text: 'Status Tidak Diketahui', color: '#6c757d' };

                  if (b.status === 'approved') {
                    statusInfo = { text: 'Approved', color: '#28a745' }; // Hijau
                  } else if (b.status === 'pending') {
                    statusInfo = { text: 'Sedang ditinjau Admin', color: '#ffc107' }; // Kuning
                  } else if (b.status === 'revisi') {
                    // ✅ PERBAIKAN: Ubah warna untuk revisi menjadi merah
                    statusInfo = { text: 'Perlu Revisi', color: '#dc3545' }; // Merah
                  }

                  return (
                    <div
                      key={b.id}
                      style={{
                        position: 'relative',
                        marginBottom: '1.5rem',
                        cursor: b.status === 'approved' || b.status === 'revisi' ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (b.status === 'approved') {
                          setSelectedNewsId(b.id);
                          setPage('newsdetail');
                        } else if (b.status === 'revisi') {
                          setEditingPost(b); 
                          setPage('unggah');
                        }
                      }}
                    >
                      <BeritaCard
                        b={b}
                        variant="list"
                        setSelectedNewsId={() => {}} 
                        setPage={() => {}}
                        setSelectedAuthorId={setSelectedAuthorId}
                      />
                      <div style={{ position: 'absolute', top: 10, right: 10, textAlign: 'right' }}>
                        <span style={{ padding: '5px 10px', borderRadius: '12px', fontSize: '12px', color: 'white', fontWeight: 'bold', backgroundColor: statusInfo.color }}>
                          {statusInfo.text}
                        </span>
                        {b.status === 'revisi' && b.revisi_catatan && (
                          <div style={{ marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: '8px', fontSize: '11px', color: 'white', maxWidth: '200px', fontStyle: 'italic' }}>
                            {b.revisi_catatan}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        );

        case 'reset-password':
            return (
                <div className="auth-page">
                    <div className="auth-box">
                        <h1>Buat Password Baru</h1>
                        <form onSubmit={handleUpdatePassword}>
                            <input type="password" name="password" placeholder="Masukkan password baru Anda" required />
                            <button type="submit" className="btn-primary">Simpan Password Baru</button>
                        </form>
                    </div>
                </div>
            );
            
        case "nasional":
            return ( <main className="container"> <nav className="breadcrumb"> <span onClick={() => setPage("home")} style={{ cursor: "pointer", color: "blue" }} > Beranda </span>{" > "} <span>Nasional</span> </nav> <h2>Berita Sepakbola Nasional</h2> <div className="grid-berita"> {data.nasional.map((b) => ( <div key={b.id} className="berita-grid-card" onClick={() => { setSelectedNewsId(b.id); setPage("newsdetail"); }} > {b.gambar && ( <img src={b.gambar} alt={b.judul} className="thumb" /> )} <h3>{b.judul}</h3> <p className="meta"> Oleh{" "} <b className="author-link" style={{ cursor: "pointer", color: "blue" }} onClick={(e) => { e.stopPropagation(); setSelectedAuthorId(b.author_id); setPage('authorProfile'); }} > {b.author || "Unknown"} </b> <br /> {new Date(b.created_at).toLocaleString("id-ID")} </p> </div> ))} </div> </main> );
        case "internasional":
            return ( <main className="container"> <nav className="breadcrumb"> <span onClick={() => setPage("home")} style={{ cursor: "pointer", color: "blue" }} > Beranda </span>{" > "} <span>Internasional</span> </nav> <h2>Berita Sepakbola Internasional</h2> <div className="grid-berita"> {data.internasional.map((b) => ( <div key={b.id} className="berita-grid-card" onClick={() => { setSelectedNewsId(b.id); setPage("newsdetail"); }} > {b.gambar && ( <img src={b.gambar} alt={b.judul} className="thumb" /> )} <h3>{b.judul}</h3> <p className="meta"> Oleh{" "} <b className="author-link" style={{ cursor: "pointer", color: "blue" }} onClick={(e) => { e.stopPropagation(); setSelectedAuthorId(b.author_id); setPage('authorProfile'); }} > {b.author || "Unknown"} </b> <br /> {new Date(b.created_at).toLocaleString("id-ID")} </p> </div> ))} </div> </main> );
        case "home":
        default:
            return (
                <main className="container">
                    <section className="section"> <h2>TOP HEADLINES</h2> <div className="headlines-grid"> {data.headlines.slice(0, 3).map((b) => ( <BeritaCard key={b.id} b={b} variant="card" setSelectedNewsId={setSelectedNewsId} setPage={setPage} setSelectedAuthorId={(id) => { setSelectedAuthorId(id); setPage('authorProfile'); }} /> ))} </div> </section>
                    <section className="section"> <h2>SEPAKBOLA NASIONAL</h2> <div className="content-grid"> <div className="berita-list"> {data.nasional.slice(0, 6).map((b) => ( <BeritaCard key={b.id} b={b} variant="list" setSelectedNewsId={setSelectedNewsId} setPage={setPage} setSelectedAuthorId={(id) => { setSelectedAuthorId(id); setPage('authorProfile'); }} /> ))} </div> <div className="klasemen-box"> <TabelKlasemen klasemen={data.klasemen} liga="Indonesia" /> <TabelKlasemen klasemen={data.klasemen} liga="Inggris" /> <TabelKlasemen klasemen={data.klasemen} liga="UNY" /> </div> </div> </section>
                    <section className="section"> <h2>SEPAKBOLA INTERNASIONAL</h2> <div className="headlines-grid"> {data.internasional.slice(0, 6).map((b) => ( <BeritaCard key={b.id} b={b} variant="card" setSelectedNewsId={setSelectedNewsId} setPage={setPage} setSelectedAuthorId={(id) => { setSelectedAuthorId(id); setPage('authorProfile'); }} /> ))} </div> </section>
                </main>
            );
    }
  }

  return (
    <div>
      <Navbar {...navProps} />
      {renderPage()}
      <Footer />
      {popupMessage && (
        <Popup message={popupMessage} onClose={() => setPopupMessage("")} />
      )}
    </div>
  );
}

function Navbar({ onNavigate, logout, session, profile, searchQuery, setSearchQuery, searchResults, isSearchFocused, setIsSearchFocused, loadingSearch, handleFollow, handleUnfollow, followingIds, setSelectedAuthorId, navigateToNewsDetail }) { 
    const [showLiputan, setShowLiputan] = useState(false); 
    const [showMobileMenu, setShowMobileMenu] = useState(false); 
    const [showDropdown, setShowDropdown] = useState(false); 
    const searchRef = useRef(null); 
    
    useEffect(() => { 
        function handleClickOutside(event) { 
            if (searchRef.current && !searchRef.current.contains(event.target)) { 
                setIsSearchFocused(false); 
            } 
        } 
        document.addEventListener("mousedown", handleClickOutside); 
        return () => document.removeEventListener("mousedown", handleClickOutside); 
    }, [searchRef]); 
    
    const menuItems = ["HOME", "NASIONAL", "INTERNASIONAL"]; 
    
    return ( 
        <header className="main-header"> 
            <div className="topbar"> 
                <div className="logo" onClick={() => onNavigate("home")} style={{ cursor: "pointer" }}> 
                    <img src={MojokLogo} alt="Mojok Logo" className="mojok-logo" />
                </div> 
                <div className="topbar-right"> 
                    <button className="btn-submit" onClick={() => onNavigate("unggah")}>✍️ KIRIM ARTIKEL</button> 
                    <div className="social-icons"> 
                        <span className="circle pink"></span><span className="circle black">X</span><span className="circle blue"></span> 
                        <span className="circle black">🎵</span><span className="circle red"></span> 
                    </div> 
                    <div className="search-container" ref={searchRef}> 
                        <div className="search-box"> 
                            <input type="text" placeholder="Cari..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} /> 
                            <button>🔍</button> 
                        </div> 
                        {isSearchFocused && ( 
                            <div className="search-results-dropdown"> 
                                {loadingSearch && <div className="search-result-item info-text">Mencari...</div>} 
                                {!loadingSearch && searchQuery && searchResults.users.length === 0 && searchResults.news.length === 0 && ( 
                                    <div className="search-result-item info-text">Tidak ada hasil ditemukan.</div> 
                                )} 
                                {!loadingSearch && searchResults.users.length > 0 && ( 
                                    <> 
                                        <div className="search-group-header">Pengguna</div> 
                                        {searchResults.users.map((user) => ( 
                                            <div key={user.id} className="search-result-item" onClick={() => { setSelectedAuthorId(user.id); setSearchQuery(''); setIsSearchFocused(false); }}> 
                                                <img src={user.avatar_url || "https://cdn-icons-png.flaticon.com/512/847/847969.png"} alt={user.name} className="search-avatar" /> 
                                                <span className="search-name">{user.name}</span> 
                                                {followingIds.has(user.id) ? ( 
                                                    <button className="follow-btn following" onClick={(e) => { e.stopPropagation(); handleUnfollow(user.id); }}>Following</button> 
                                                ) : ( 
                                                    <button className="follow-btn" onClick={(e) => { e.stopPropagation(); handleFollow(user.id); }}>Follow</button> 
                                                )} 
                                            </div> 
                                        ))} 
                                    </> 
                                )} 
                                {!loadingSearch && searchResults.news.length > 0 && ( 
                                    <> 
                                        <div className="search-group-header">Berita</div> 
                                        {searchResults.news.map((newsItem) => ( 
                                            <div key={newsItem.id} className="search-result-item" onClick={() => { navigateToNewsDetail(newsItem.id); setIsSearchFocused(false); }}> 
                                                <img src={newsItem.gambar || "https://via.placeholder.com/50x50"} alt={newsItem.judul} className="search-news-thumb" /> 
                                                <div className="search-news-details"> 
                                                    <span className="search-name">{newsItem.judul}</span> 
                                                    <span className="search-news-category">{newsItem.kategori}</span> 
                                                </div> 
                                            </div> 
                                        ))} 
                                    </> 
                                )} 
                            </div> 
                        )} 
                    </div> 
                    <div className="profile-container"> 
                        <img src={profile?.avatar_url || "https://cdn-icons-png.flaticon.com/512/847/847969.png"} alt="profile" className="profile-pic" onClick={() => setShowDropdown(!showDropdown)} /> 
                        {showDropdown && ( 
                            <div className="profile-dropdown"> 
                                {!session ? ( 
                                    <button className="dropdown-btn" onClick={() => { onNavigate("login"); setShowDropdown(false); }}>Login / Register</button> 
                                ) : ( 
                                    <> 
                                        <button className="dropdown-btn" onClick={() => onNavigate("profil")}>Lihat Profil</button> 
                                        <button className="dropdown-btn" onClick={() => onNavigate("unggah")}>Unggah Tulisan</button> 
                                        <button className="dropdown-btn" onClick={() => onNavigate("tulisan-saya")}>Lihat Tulisan Saya</button> 
                                        <button className="dropdown-btn logout" onClick={logout}>Logout</button> 
                                    </> 
                                )} 
                            </div> 
                        )} 
                    </div> 
                </div> 
            </div> 
            <nav className="navbar-menu"> 
                {menuItems.map((m, i) => ( <a key={i} href="#" onClick={(e) => { e.preventDefault(); const lower = m.toLowerCase(); if (lower === "nasional") onNavigate("nasional"); else if (lower === "internasional") onNavigate("internasional"); else onNavigate("home"); }}> {m} </a> ))} 
                <div className="dropdown" onMouseEnter={() => setShowLiputan(true)} onMouseLeave={() => setShowLiputan(false)}></div> 
                <a href="#">KILAS</a><a href="#">POJOKAN</a><a href="#">OTOMOJOK</a><a href="#">KONTER</a> 
                <a href="#">MALAM JUMAT</a><a href="#">MOVI</a><a href="#">TERMINAL</a> 
            </nav> 
            {showMobileMenu && ( <div className="mobile-menu"> {menuItems.map((m, i) => ( <a key={i} href="#" onClick={(e) => { e.preventDefault(); setShowMobileMenu(false); const lower = m.toLowerCase(); if (lower === "nasional") onNavigate("nasional"); else if (lower === "internasional") onNavigate("internasional"); else onNavigate("home"); }}> {m} </a> ))} </div> )} 
        </header> 
    );
}
function BeritaCard({ b, variant, setSelectedNewsId, setPage, setSelectedAuthorId }) { return ( <div className={`berita-card ${variant}`} onClick={setSelectedNewsId ? () => { setSelectedNewsId(b.id); setPage("newsdetail"); } : null} > <div className="thumb"> <img src={b.gambar || "https://via.placeholder.com/250"} alt={b.judul} /> </div> <div className="info"> <h3>{b.judul}</h3> <p className="meta"> Oleh{" "} <b className="author-link" style={{ cursor: "pointer", color: "blue" }} onClick={(e) => { e.stopPropagation(); if (b.author_id) setSelectedAuthorId(b.author_id); }} > {b.author || "Unknown"} </b>{" "} –{" "} {new Date(b.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric", })} </p> </div> </div> );}
function TabelKlasemen({ klasemen, liga }) { return ( <div className="klasemen"> <h3>Klasemen Liga {liga}</h3> <table> <thead> <tr> <th>Pos</th> <th>Tim</th> <th>Poin</th> </tr> </thead> <tbody> {klasemen .filter((r) => r.liga === liga) .map((r, i) => ( <tr key={r.id}> <td>{i + 1}</td> <td>{r.tim}</td> <td>{r.poin}</td> </tr> ))} </tbody> </table> </div> );}
function Popup({ message, onClose }) { 
  const isSuccess = message.toLowerCase().includes("berhasil") || !message.toLowerCase().includes("gagal");
  return ( 
    <div className="popup-overlay"> 
      <div className={`popup-box ${isSuccess ? "success" : "error"}`}> 
        <div className="popup-header"> 
          <span className="popup-icon">{isSuccess ? "✔️" : "❌"}</span> 
          <h2>{isSuccess ? "Sukses" : "Gagal"}</h2> 
        </div> 
        <p className="popup-message">{message}</p> 
        <button className="popup-btn" onClick={onClose}> Oke </button> 
      </div> 
    </div> 
  );
}