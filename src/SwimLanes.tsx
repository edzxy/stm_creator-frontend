import React from 'react';
import './SwimlaneStyle.css';

interface SwimlaneProps {
    vastClasses: string[];
}

const SwimLanes: React.FC<SwimlaneProps> = ({ vastClasses }) => {
    // Reverse the classes to match our layout (higher classes on left)
    const uniqueClasses = [...new Set(vastClasses)].sort().reverse();

    return (
        <div className="swimlane-container">
            {uniqueClasses.map((vastClass, index) => {
                const classNumber = parseInt(vastClass.replace('Class ', ''));
                const width = `${100 / uniqueClasses.length}%`;
                const left = `${(index * 100) / uniqueClasses.length}%`;

                return (
                    <div
                        key={vastClass}
                        className={`swimlane class-${classNumber}`}
                        style={{
                            width,
                            left,
                            opacity: 0.15  // Subtle background
                        }}
                    >
                        <div className="swimlane-label">
                            {vastClass}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SwimLanes;