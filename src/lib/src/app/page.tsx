"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: project, error } = await supabase
          .from('projects')
          .insert([{ user_id: user.id, title: 'Mon Projet', data: {}, status: 'draft' }])
          .select()
          .single();
        if (project) setProjectId(project.id);
      }
    };
    checkUser();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setLoading(true);

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: 'mistral-tiny',
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant spécialisé dans l'analyse de projets entrepreneuriaux.
              Pour chaque message de l'utilisateur, analyse et réponds en JSON avec :
              {
                "classification": {
                  "solide": ["liste des éléments solides"],
                  "hypothese": ["liste des hypothèses"],
                  "critique": ["liste des points critiques"],
                  "contradiction": ["liste des contradictions"],
                  "opportunite": ["liste des opportunités"]
                },
                "questions": ["liste des questions à poser pour approfondir"]
              }
              Réponds UNIQUEMENT en JSON valide.`,
            },
            ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
            userMessage,
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MISTRAL_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiMessage = response.data.choices[0].message.content;
      setMessages((prev) => [...prev, { role: 'assistant', content: aiMessage }]);
      setLoading(false);

      if (projectId) {
        await supabase.from('conversations').insert([
          {
            project_id: projectId,
            messages: [...messages, userMessage, { role: 'assistant', content: aiMessage }],
            metadata: JSON.parse(aiMessage),
          },
        ]);
      }
    } catch (error) {
      console.error('Erreur Mistral API:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: "Désolé, une erreur est survenue avec l'IA." }]);
      setLoading(false);
    }
  };

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test@projekta.fr',
      password: 'Projekta2024!',
    });
    if (error) console.error(error);
  };

  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email: 'test@projekta.fr',
      password: 'Projekta2024!',
    });
    if (error) console.error(error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">🚀 Mon Projet Entrepreneurial</h1>
          {user ? (
            <button onClick={signOut} className="bg-red-500 text-white px-4 py-2 rounded">
              Déconnexion
            </button>
          ) : (
            <div className="space-x-2">
              <button onClick={signIn} className="bg-blue-500 text-white px-4 py-2 rounded">
                Connexion
              </button>
              <button onClick={signUp} className="bg-green-500 text-white px-4 py-2 rounded">
                Inscription
              </button>
            </div>
          )}
        </div>

        {user ? (
          <>
            <div className="h-96 overflow-y-auto mb-4 border p-4 rounded bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-gray-500">Décris ton projet pour commencer...</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && <p className="text-gray-500">L'IA réfléchit...</p>}
            </div>

            <div className="flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Décris ton projet..."
                className="flex-1 border p-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '...' : 'Envoyer'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">Connecte-toi pour commencer.</p>
        )}
      </div>
    </div>
  );
}
