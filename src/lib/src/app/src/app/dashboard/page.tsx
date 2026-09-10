"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchProjects(user.id);
      } else {
        router.push('/');
      }
    };
    checkUser();
  }, [router]);

  const fetchProjects = async (userId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);
    if (data) setProjects(data);
  };

  const fetchConversations = async (projectId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('project_id', projectId);
    if (data) {
      const allData = data.flatMap((conv) => {
        try {
          return conv.metadata;
        } catch {
          return {};
        }
      });
      setHypotheses(allData.flatMap(d => d.classification?.hypothese || []));
      setRisks(allData.flatMap(d => d.classification?.critique || []));
      setOpportunities(allData.flatMap(d => d.classification?.opportunite || []));
    }
  };

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    fetchConversations(project.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">📊 Tableau de bord</h1>

        <div className="mb-4">
          <h2 className="text-xl font-semibold">Mes projets</h2>
          <div className="mt-2 space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className={`p-2 rounded w-full text-left ${selectedProject?.id === project.id ? 'bg-blue-100' : 'bg-gray-100'}`}
              >
                {project.title} ({project.status})
              </button>
            ))}
          </div>
        </div>

        {selectedProject && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Analyse du projet</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">🟠 Hypothèses</h3>
                <ul className="list-disc pl-5">
                  {hypotheses.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">🔴 Risques</h3>
                <ul className="list-disc pl-5">
                  {risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">💡 Opportunités</h3>
                <ul className="list-disc pl-5">
                  {opportunities.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
