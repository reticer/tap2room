import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`bg-ios-card dark:bg-ios-darkCard rounded-3xl shadow-ios dark:shadow-ios-dark overflow-hidden ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
