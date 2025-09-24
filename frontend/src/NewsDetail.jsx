// src/NewsDetail.jsx (Versi Perbaikan: Tambah Image Credit)

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./news.css";

export default function NewsDetail({ id, onSelect, onBack, user, onSelectAuthor }) {
  const [news, setNews] = useState(null);
  const [editorsPick, setEditorsPick] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [imageCredit, setImageCredit] = useState(""); // <<< State baru untuk credit gambar

  // === Fetch berita detail ===
  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);

     const fetchNews = async () => {
            const { data, error } = await supabase
                .from("berita")
                .select("*, profiles(name)") // <--- PERUBAHAN PENTING
                .eq("id", id)
                .single();
            
            if (error) return console.error(error);
            
            // Gabungkan nama penulis ke dalam objek berita utama
            const newsData = {
                ...data,
                author: data.profiles?.name || "Redaksi"
            };

            setNews(newsData);
      // <<< Ambil image_credit dari data berita jika ada
      if (data && data.image_credit) {
        setImageCredit(data.image_credit);
      } else {
        setImageCredit(""); // Pastikan kosong jika tidak ada
      }
    };

    const fetchEditorsPick = async () => {
      const { data, error } = await supabase
        .from("berita")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return console.error(error);
      setEditorsPick(data || []);
    };

    fetchNews();
    fetchEditorsPick();
  }, [id]);

  // (Sisa useEffects dan handlers lainnya tetap sama persis seperti sebelumnya)
  // === Fetch likes ===
  useEffect(() => {
    if (!id) return;

    const fetchLikes = async () => {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id);
      setLikesCount(count || 0);
    };

    const checkLiked = async () => {
      if (!user) return setLiked(false);
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setLiked(!!data);
    };

    fetchLikes();
    checkLiked();
  }, [id, user]);

  // === Fetch comments ===
  useEffect(() => {
    if (!id) return;

    const fetchComments = async () => {
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select(
          `id, content, created_at, parent_id, user_id, profiles!comments_user_id_fkey (id, name, avatar_url)`
        )
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (error) return console.error(error);

      const commentsWithUser = commentsData.map((c) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        parent_id: c.parent_id,
        user_id: c.user_id,
        name: c.profiles?.name || "Anonim",
        avatar: c.profiles?.avatar_url || null,
      }));

      setComments(commentsWithUser);
    };

    fetchComments();
  }, [id]);

  // === Handlers ===
  const handleLike = async () => {
    if (!user) return alert("Login dulu untuk like");

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", id)
        .eq("user_id", user.id);
      setLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      await supabase.from("likes").insert({ post_id: id, user_id: user.id });
      setLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const handleComment = async () => {
    if (!user) return alert("Login dulu untuk komentar");
    if (!commentText.trim()) return;

    const { data: newComment } = await supabase
      .from("comments")
      .insert({ post_id: id, user_id: user.id, content: commentText })
      .select( `id, content, created_at, parent_id, user_id, profiles!comments_user_id_fkey (id, name, avatar_url)`)
      .single();

    if (newComment) {
      setComments([
        {
          id: newComment.id,
          content: newComment.content,
          created_at: newComment.created_at,
          parent_id: newComment.parent_id,
          user_id: newComment.user_id,
          name: newComment.profiles?.name || "Anonim",
          avatar: newComment.profiles?.avatar_url || null,
        },
        ...comments,
      ]);
      setCommentText("");
    }
  };

  const handleReply = async (parentId, parentName) => {
    if (!user) return alert("Login dulu untuk balas komentar");
    if (!replyText.trim()) return;

    const { data: newReply } = await supabase
      .from("comments")
      .insert({
        post_id: id,
        user_id: user.id,
        content: `@${parentName} ${replyText}`,
        parent_id: parentId,
      })
      .select(`id, content, created_at, parent_id, user_id, profiles!comments_user_id_fkey (id, name, avatar_url)`)
      .single();

    if (newReply) {
      setComments((prev) => [
        ...prev,
        {
          id: newReply.id,
          content: newReply.content,
          created_at: newReply.created_at,
          parent_id: newReply.parent_id,
          user_id: newReply.user_id,
          name: newReply.profiles?.name || "Anonim",
          avatar: newReply.profiles?.avatar_url || null,
        },
      ]);
      setReplyText("");
      setReplyingTo(null);
    }
  };

  const handleReport = (commentId) => alert(`Komentar ${commentId} dilaporkan!`);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: news?.judul, text: "Baca artikel ini!", url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link disalin ke clipboard!");
    }
  };

  const toggleReplies = (commentId) => {
    setShowReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const renderComments = (parentId = null) => {
    return comments
      .filter((c) => c.parent_id === parentId)
      .map((c) => {
        const replies = comments.filter((r) => r.parent_id === c.id);
        return (
          <li key={c.id} className="comment-item">
            <div className="comment-main">
              {c.avatar && <img src={c.avatar} alt={c.name} className="comment-avatar" />}
              <div className="comment-body">
                <div className="comment-header">
                  <b style={{ cursor: "pointer", color: "blue" }}
                     onClick={() => onSelectAuthor && onSelectAuthor(c.user_id)}
                  >
                    {c.name}
                  </b>
                  <span className="comment-date">{new Date(c.created_at).toLocaleString("id-ID")}</span>
                </div>
                <div className="comment-text">{c.content}</div>
                <div className="comment-actions">
                  <span onClick={() => setReplyingTo(c.id)}>Balas</span>
                  {replies.length > 0 && (
                    <span onClick={() => toggleReplies(c.id)} style={{ marginLeft: "10px", cursor: "pointer", color: "blue" }}>
                      {showReplies[c.id] ? "Sembunyikan balasan" : `Lihat balasan (${replies.length})`}
                    </span>
                  )}
                  <span onClick={() => handleReport(c.id)}>Laporkan</span>
                </div>
                {replyingTo === c.id && (
                  <div className="comment-form reply-form">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Balas ${c.name}...`} />
                    <button onClick={() => handleReply(c.id, c.name)}>Kirim</button>
                  </div>
                )}
                {replies.length > 0 && showReplies[c.id] && (
                  <ul className="comment-replies">
                    {replies.map((r) => (
                      <li key={r.id} className="comment-reply">
                        {r.avatar && <img src={r.avatar} alt={r.name} className="comment-avatar-reply" />}
                        <span>
                          <b style={{ cursor: "pointer", color: "blue" }}
                             onClick={() => onSelectAuthor && onSelectAuthor(r.user_id)}
                          >
                            {r.name}
                          </b>: {r.content}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        );
      });
  };

  if (!news) return <p>Loading...</p>;

  return (
    <div className="news-page">
      <div className="news-content">
        <div className="breadcrumb">
          <span onClick={onBack} style={{ cursor: "pointer", color: "#007bff" }}>Beranda</span>
          {" > "}
          <span onClick={() => onSelect(`page:${news.kategori?.toLowerCase()}`)} style={{ cursor: "pointer", color: "#007bff" }}>
            {news.kategori?.toUpperCase()}
          </span>
          {" > "}
          <span>{news.judul}</span>
        </div>
        <span className="news-category">{news.kategori?.toUpperCase()}</span>
        <h1 className="news-title">{news.judul}</h1>
        <div className="news-meta">
          <span>
            By{" "}
            <b className="author-link"
               onClick={() => onSelectAuthor && onSelectAuthor(news.author_id)}
               style={{ cursor: "pointer", color: "blue" }}
            >
              {news.author || "Redaksi"}
            </b>
          </span>
          <span>{new Date(news.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
        <img src={news.gambar || "https://via.placeholder.com/800x400"} alt={news.judul} className="news-image" />
        {/* <<< Bagian baru untuk menampilkan credit gambar */}
        {imageCredit && <p className="image-credit">{imageCredit}</p>} 
        {/* <<< Akhir bagian baru */}
        <div className="news-body" dangerouslySetInnerHTML={{ __html: news.konten?.replace(/\n/g, '<br />') }} />
        <div className="news-actions">
          <button onClick={handleLike} className={liked ? "btn-like liked" : "btn-like"}>❤️ {likesCount}</button>
          <button onClick={handleShare} className="btn-share">🔗 Share</button>
        </div>
        <div className="news-comments">
          <h3>Komentar</h3>
          {user && (
            <div className="comment-form">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Tulis komentar..." />
              <button onClick={handleComment}>Kirim</button>
            </div>
          )}
          <ul>{renderComments()}</ul>
        </div>
      </div>
      <aside className="news-sidebar">
        <h3>EDITOR'S PICK</h3>
        <ul>
          {editorsPick.map((item) => (
            <li key={item.id} onClick={() => onSelect(item.id)}>
              <img src={item.gambar || "https://via.placeholder.com/100"} alt={item.judul} />
              <div>
                <p className="ep-title">{item.judul}</p>
                <p className="ep-meta">
                  <span className="ep-category">{item.kategori?.toUpperCase()}</span> •{" "}
                  {new Date(item.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}