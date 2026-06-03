import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 

function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    async function loadData() {
      // 1. FETCH BOTH TABLES AT ONCE
      // This tells Supabase: "Grab the post, and also grab all matching rows from post_images!"
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          full_name,
          caption,
          created_at,
          post_images (image_url, position)
        `);

      if (error) {
        console.error("Error loading posts:", error);
        return;
      }

      // 2. Prepare data with local likes/comments trackers
      const preparedData = data.map(post => ({
        ...post,
        likes: post.likes || 0,
        comments: post.comments || []
      }));

      setPosts(preparedData);
    }

    loadData();
  }, []);

  const handleLike = (postId) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  const handleComment = (postId) => {
    const commentText = prompt("Type your comment:");
    if (!commentText) return;
    setPosts(posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, commentText] } : p));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Home Feed</h1>
      
      {posts.map(post => (
        <div key={post.id} style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px', padding: '15px' }}>
          
          {/* User Name */}
          <h3 style={{ margin: '0 0 10px 0' }}>{post.full_name}</h3>
          
          {/* 3. LOOP THROUGH THE IMAGES FOR THIS POST */}
          {post.post_images && post.post_images.map((img, index) => (
            <img 
              key={index}
              src={img.image_url} 
              alt={`Post content ${img.position}`} 
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }} 
            />
          ))}
          
          {/* Caption */}
          <p style={{ marginTop: '10px' }}>{post.caption}</p>
          
          {/* Interactive Bar */}
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button onClick={() => handleLike(post.id)}>❤️ Like ({post.likes})</button>
            <button onClick={() => handleComment(post.id)}>💬 Comment ({post.comments.length})</button>
          </div>

          {/* Comments List */}
          <div style={{ paddingLeft: '20px', marginTop: '10px' }}>
            {post.comments.map((comment, index) => (
              <p key={index} style={{ fontSize: '14px', color: '#666', margin: '4px 0' }}>• {comment}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Home;

