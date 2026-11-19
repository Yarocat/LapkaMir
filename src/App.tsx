import { useEffect, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { CharacterCreator } from './components/CharacterCreator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameWorld } from './components/GameWorld';
import backendService, { AuthUserDTO } from './services/backendService.js';
import { CharacterConfig, Outfit, UserProfile } from './types/game';

function AppContent() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUserDTO | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingAppearance, setIsEditingAppearance] = useState(false);

  useEffect(() => {
    let active = true;
    backendService
      .getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setAuthReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSaveCharacter = async (config: CharacterConfig) => {
    setSavingProfile(true);
    try {
      const updatedUser = await backendService.saveCharacter(config);
      setUser(updatedUser);
      setIsEditingAppearance(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateOutfit = async (outfit: Outfit) => {
    if (!user?.character) return;
    const updatedUser = await backendService.saveCharacter({
      name: user.character.name,
      gender: user.character.gender,
      race: user.character.race,
      phenotype: user.character.phenotype,
      outfit,
    });
    setUser(updatedUser);
  };

  const handleLogout = () => {
    backendService.logout();
    setUser(null);
    setIsEditingAppearance(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#181622] text-amber-300 gap-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-extrabold text-sm tracking-wide">Загружаем ЛапкоГрад...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSuccess={(authedUser) => setUser(authedUser)} />;
  }

  if (!user.hasCharacter || !user.character) {
    return (
      <CharacterCreator
        saving={savingProfile}
        onSave={handleSaveCharacter}
      />
    );
  }

  const profile: UserProfile = user.character;

  if (isEditingAppearance) {
    return (
      <CharacterCreator
        initialCharacter={profile}
        isEditingExisting
        saving={savingProfile}
        onSave={handleSaveCharacter}
        onCancel={() => setIsEditingAppearance(false)}
      />
    );
  }

  return (
    <GameWorld
      profile={profile}
      onEditAppearance={() => setIsEditingAppearance(true)}
      onUpdateOutfit={handleUpdateOutfit}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
