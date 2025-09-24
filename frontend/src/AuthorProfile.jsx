// src/AuthorProfile.jsx (Versi Perbaikan dengan Inline Style)

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./authorProfile.css";

// Komponen Modal tidak perlu diubah
function UserListModal({ userId, listType, onClose, currentUser, followingIds = new Set(), handleFollow, handleUnfollow }) {
  // ... (isi kode UserListModal tetap sama persis)
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const title = listType === "followers" ? "Pengikut" : "Mengikuti";

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const fromTable = "followers";
      const selectId = listType === "followers" ? "follower_id" : "following_id";
      const whereId = listType === "followers" ? "following_id" : "follower_id";
      const { data: idData, error: idError } = await supabase.from(fromTable).select(selectId).eq(whereId, userId);
      if (idError || !idData || idData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      const userIds = idData.map((item) => item[selectId]);
      const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds);
      if (profilesError) console.error("Error fetching profiles:", profilesError);
      else setUsers(profilesData || []);
      setLoading(false);
    };
    fetchUsers();
  }, [userId, listType]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (<p>Loading...</p>) : users.length === 0 ? (<p>Tidak ada pengguna untuk ditampilkan.</p>) : (
            users.map((user) => (
              <div key={user.id} className="user-list-item">
                <img src={ user.avatar_url || "https://cdn-icons-png.flaticon.com/512/847/847969.png" } alt={user.name} />
                <span className="user-name">{user.name}</span>
                {currentUser && currentUser.id !== user.id &&
                  (followingIds.has(user.id) ? (
                    <button className="follow-btn following" onClick={() => handleUnfollow(user.id)}>Following</button>
                  ) : (
                    <button className="follow-btn" onClick={() => handleFollow(user.id)}>Follow</button>
                  ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// =================== KOMPONEN UTAMA PROFIL AUTHOR ==================
// ===================================================================
export default function AuthorProfile({
  authorId,
  onBack,
  onSelectNews,
  currentUser,
  followingIds = new Set(),
  handleFollow,
  handleUnfollow,
}) {
  const [author, setAuthor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [modalState, setModalState] = useState({
    isOpen: false,
    listType: null,
  });

  // --- STYLE UNTUK TOMBOL KEMBALI (DITARUH DI SINI) ---
  const pageStyle = {
    position: 'relative', // Penting agar tombol bisa diposisikan
    paddingTop: '50px',   // Beri jarak agar konten tidak tertimpa tombol
  };

  const backButtonStyle = {
    position: 'absolute', // Membuat tombol "mengambang"
    top: '15px',
    left: '15px',       // Memastikan posisi di kiri
    backgroundColor: '#f0f2f5',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: 10,
  };
  // --- END OF STYLE ---

  useEffect(() => {
    if (!authorId) return;
    const fetchAuthorData = async () => {
      const { data: profileData } = await supabase.from("profiles").select("id, name, avatar_url, bio").eq("id", authorId).single();
      setAuthor(profileData);
      const { data: postsData } = await supabase.from("berita").select("id, judul, created_at, kategori, gambar").eq("author_id", authorId).order("created_at", { ascending: false });
      setPosts(postsData || []);
      const { count: followers } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", authorId);
      setFollowerCount(followers);
      const { count: following } = await supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", authorId);
      setFollowingCount(following);
    };
    fetchAuthorData();
  }, [authorId, followingIds]);

  if (!author) return <p className="loading-text">Loading profil...</p>;

  const openModal = (listType) => setModalState({ isOpen: true, listType });
  const closeModal = () => setModalState({ isOpen: false, listType: null });

  const isFollowing = followingIds.has(authorId);
  const isSelf = currentUser?.id === authorId;

  return (
    <>
      <div className="author-page" style={pageStyle}> {/* Style diterapkan di sini */}
        <button style={backButtonStyle} onClick={onBack}> {/* Style diterapkan di sini */}
          ←
        </button>

        <div className="author-header">
          {/* ... sisa kode lainnya sama persis ... */}
          <img src={author.avatar_url || "https://via.placeholder.com/120"} alt={author.name} className="profil-avatar" />
          <div className="author-info">
            <h2>{author.name}</h2>
            <div className="author-stats">
              <span><b>{posts.length}</b> Tulisan</span>
              <span className="clickable-stat" onClick={() => openModal("followers")}><b>{followerCount}</b> Pengikut</span>
              <span className="clickable-stat" onClick={() => openModal("following")}><b>{followingCount}</b> Mengikuti</span>
            </div>
            <p className="author-bio">{author.bio || "Pengguna ini belum menulis bio."}</p>
          </div>
          <div className="author-actions">
            {!isSelf && currentUser && (isFollowing ? (
                <button className="follow-btn following" onClick={() => handleUnfollow(authorId)}>Following</button>
            ) : (
                <button className="follow-btn" onClick={() => handleFollow(authorId)}>Follow</button>
            ))}
          </div>
        </div>

        <div className="author-posts">
          <h3>Tulisan oleh {author.name}</h3>
          {posts.length === 0 ? (<p>Author ini belum menulis artikel apapun.</p>) : (
            <div className="posts-grid">
              {posts.map((p) => (
                <div key={p.id} className="post-card" onClick={() => onSelectNews && onSelectNews(p.id)}>
                  <img src={p.gambar || "https://via.placeholder.com/300x180"} alt={p.judul} className="post-card-thumb" />
                  <div className="post-card-info">
                    <h4>{p.judul}</h4>
                    <small>{p.kategori?.toUpperCase()} • {new Date(p.created_at).toLocaleDateString("id-ID")}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalState.isOpen && (
        <UserListModal
          userId={authorId}
          listType={modalState.listType}
          onClose={closeModal}
          currentUser={currentUser}
          followingIds={followingIds}
          handleFollow={handleFollow}
          handleUnfollow={handleUnfollow}
        />
      )}
    </>
  );
}