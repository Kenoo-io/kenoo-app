"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findSpintaxMatches } from './spintax-utils';

interface SpintaxTextProps {
  text: string;
  className?: string;
}

/**
 * Component that renders text with spintax patterns visually indicated
 * Spintax shows only first option by default, all options joined with " / " on hover
 * Uses Framer Motion for smooth animations
 */
export function SpintaxText({ text, className }: SpintaxTextProps) {
  const matches = findSpintaxMatches(text);
  
  // If no spintax found, just return the text
  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }
  
  // Build array of text segments and spintax matches
  const segments: Array<{ type: 'text' | 'spintax'; content: string; options?: string[] }> = [];
  let lastIndex = 0;
  
  matches.forEach((match) => {
    // Add text before the match
    if (match.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.startIndex),
      });
    }
    
    // Add the spintax match
    segments.push({
      type: 'spintax',
      content: match.fullMatch,
      options: match.options,
    });
    
    lastIndex = match.endIndex;
  });
  
  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }
  
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <React.Fragment key={index}>{segment.content}</React.Fragment>;
        }
        
        // Render spintax - show first option by default, all options on hover
        return (
          <SpintaxSpan
            key={index}
            options={segment.options || []}
          />
        );
      })}
    </span>
  );
}

function SpintaxSpan({ options }: { options: string[] }) {
  const [isHovered, setIsHovered] = useState(false);
  const firstOption = options[0] || '';
  const allOptions = options.join(' / ');
  const displayText = isHovered ? allOptions : firstOption;
  
  return (
    <motion.span
      className="underline decoration-dotted decoration-black cursor-pointer inline-block"
      style={{ textDecorationColor: 'black', textDecorationStyle: 'dotted' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={false}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={displayText}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{ display: 'inline-block' }}
        >
          {displayText}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

