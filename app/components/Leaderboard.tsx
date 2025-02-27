import { type Participant } from '../types/waitlist';
import Image from 'next/image';

interface LeaderboardProps {
  participants: Participant[];
}

export default function Leaderboard({ participants }: LeaderboardProps) {
  const sortedParticipants = [...participants].sort((a, b) => b.totalTokens - a.totalTokens);
  const [first, second, third, ...rest] = sortedParticipants;

  return (
    <div className="flex flex-col h-full">
      {/* Top 3 Podium */}
      <div className="flex justify-center items-end mb-12 mt-12 gap-12">
        {/* Second Place */}
        {second && (
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#2d2d2d] border-2 border-gray-600 flex items-center justify-center">
                <Image src="/club.svg" alt="Club" width={40} height={40} />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2d2d2d] border border-gray-600 flex items-center justify-center text-white font-bold">
                2
              </div>
            </div>
            <p className="mt-3 text-white font-medium text-lg">{second.name}</p>
            <p className="text-gray-400 font-bold">{second.totalTokens} pts</p>
          </div>
        )}

        {/* First Place */}
        {first && (
          <div className="flex flex-col items-center -mt-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#2d2d2d] border-2 border-gray-500 flex items-center justify-center">
                <Image src="/heart.svg" alt="Heart" width={56} height={56} />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2d2d2d] border border-gray-500 flex items-center justify-center text-white font-bold">
                1
              </div>
            </div>
            <p className="mt-3 text-white font-medium text-lg">{first.name}</p>
            <p className="text-gray-300 font-bold">{first.totalTokens} pts</p>
          </div>
        )}

        {/* Third Place */}
        {third && (
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#2d2d2d] border-2 border-gray-700 flex items-center justify-center">
                <Image src="/spade.svg" alt="Spade" width={40} height={40} />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2d2d2d] border border-gray-700 flex items-center justify-center text-white font-bold">
                3
              </div>
            </div>
            <p className="mt-3 text-white font-medium text-lg">{third.name}</p>
            <p className="text-gray-500 font-bold">{third.totalTokens} pts</p>
          </div>
        )}
      </div>

      {/* Rest of Leaderboard */}
      <div className="flex-1">
        <div className="bg-[#2d2d2d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#363636]">
            <div className="grid grid-cols-12 gap-4 text-sm text-gray-400">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Builder</div>
              <div className="col-span-4 text-right">Points</div>
            </div>
          </div>
          <div className="divide-y divide-[#363636]">
            {rest.map((participant, index) => (
              <div 
                key={participant.id} 
                className="grid grid-cols-12 gap-4 items-center py-3 px-4 hover:bg-[#363636] transition-colors"
              >
                <div className="col-span-1 text-gray-500">{index + 4}</div>
                <div className="col-span-7 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#363636] flex items-center justify-center">
                    <Image src="/diamond.svg" alt="Diamond" width={16} height={16} />
                  </div>
                  <span className="text-white font-medium">{participant.name}</span>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-gray-400 font-bold">{participant.totalTokens} points</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 