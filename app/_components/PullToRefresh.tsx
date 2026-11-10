"use client";

/**
 * ============================================================================
 * COMPOSANT : PullToRefresh (Actualisation par Glissement vers le Bas)
 * ============================================================================
 * Fichier : app/_components/PullToRefresh.tsx
 *
 * RÔLE CLÉ :
 * Offre aux utilisateurs smartphone et tactile l'expérience native
 * "Pull-to-Refresh" (comme sur Facebook, Instagram, Twitter) :
 * 1. Détecte le glissement du doigt vers le bas lorsque le scroll est tout en haut.
 * 2. Affiche un indicateur fluide avec résistance élastique (damping).
 * 3. Fait pivoter la flèche proportionnellement à la distance tirée.
 * 4. Déclenche une vibration haptique subtile lorsque le seuil est atteint.
 * 5. Lance la fonction `onRefresh` asynchrone avec spinner d'animation.
 * 6. Affiche un check vert de succès avant de se replier en douceur.
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowDown, Loader2, Check } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  pullThreshold?: number; // Distance en px avant déclenchement (défaut: 65px)
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  pullThreshold = 65,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const startY = useRef(0);
  const isPulling = useRef(false);

  // Vérifie si le scroll est strictement tout en haut (y compris tous les parents scrollables)
  const isScrolledToTop = useCallback(() => {
    if (typeof window === "undefined") return true;
    if (window.scrollY > 2) return false;

    let el: HTMLElement | null = containerRef.current;
    while (el && el !== document.body) {
      if (el.scrollTop > 2) return false;
      el = el.parentElement;
    }

    return true;
  }, []);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || isRefreshing || !isScrolledToTop()) {
      isPulling.current = false;
      return;
    }

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    startY.current = clientY;
    isPulling.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPulling.current || disabled || isRefreshing) return;

    if (!isScrolledToTop()) {
      setPullDistance(0);
      isPulling.current = false;
      return;
    }

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const diff = clientY - startY.current;

    if (diff > 16) {
      // Résistance élastique (logarithmique / damping) après une zone morte de 16px
      const dampedDistance = Math.min(100, Math.pow(diff - 16, 0.85) * 1.45);
      setPullDistance(dampedDistance);

      // Vibration haptique quand on franchit le seuil
      if (dampedDistance >= pullThreshold && pullDistance < pullThreshold) {
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(15);
          } catch {}
        }
      }
    } else if (diff < -5) {
      setPullDistance(0);
      isPulling.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold); // Reste accroché pendant le chargement

      try {
        await onRefresh();
        setShowSuccess(true);
        // Petit délai pour admirer le succès
        await new Promise((r) => setTimeout(r, 450));
      } catch (err) {
        console.warn("[PullToRefresh] Erreur actualisation:", err);
      } finally {
        setShowSuccess(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  // Rotation de la flèche de 0° à 180°
  const rotation = Math.min(180, (pullDistance / pullThreshold) * 180);
  const isReady = pullDistance >= pullThreshold;

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* Indicateur Flottant Style Facebook / iOS */}
      <div
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-200"
        style={{
          transform: `translate(-50%, ${pullDistance > 0 ? pullDistance - 25 : -80}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1A1A] text-white shadow-2xl border border-white/15 backdrop-blur-md">
          {showSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300">Menu actualisé !</span>
            </>
          ) : isRefreshing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#B55234]" />
              <span className="text-[11px] font-bold text-white">Actualisation...</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-4 h-4 text-[#B55234] transition-transform duration-100"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <span className="text-[11px] font-medium text-white/90">
                {isReady ? "Relâchez pour actualiser" : "Glissez pour actualiser"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Contenu enfant (sans transform CSS pour ne jamais perturber le scroll GPU ou les éléments sticky) */}
      <div>{children}</div>
    </div>
  );
}
