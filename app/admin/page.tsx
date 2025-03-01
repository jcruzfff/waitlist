'use client';

import { useState, useMemo, KeyboardEvent, ChangeEvent, useEffect, DragEvent } from 'react';
import { type Participant, type Task, PRIMARY_TASKS, SECONDARY_TASKS } from '../types/waitlist';
import { openDisplayWindow } from '../utils/window';
import { loadParticipants, saveParticipants } from '../utils/storage';
import Leaderboard from '../components/Leaderboard';

export default function AdminDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'incomplete' | 'complete'>('all');
  const [sortBy, setSortBy] = useState<'position' | 'name' | 'tokens'>('position');
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(() => {
    const storedParticipants = loadParticipants();
    return new Set(storedParticipants.map(p => p.id));
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string; name: string} | null>(null);
  const [draggedParticipant, setDraggedParticipant] = useState<string | null>(null);
  const [dragOverParticipant, setDragOverParticipant] = useState<string | null>(null);

  // Load initial state from local storage
  useEffect(() => {
    const storedParticipants = loadParticipants();
    setParticipants(storedParticipants);
    // Ensure all cards are collapsed when loading
    setCollapsedCards(new Set(storedParticipants.map(p => p.id)));
  }, []);

  // Helper function to update participants and persist changes
  const updateParticipants = (newParticipants: Participant[]) => {
    setParticipants(newParticipants);
    saveParticipants(newParticipants);
  };

  // Filter and sort participants
  const filteredParticipants = useMemo(() => {
    return participants
      .filter(participant => {
        const matchesSearch = participant.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filterType === 'all') return matchesSearch;
        
        const completedTasksCount = participant.tasks.filter(t => t.completed).length;
        const totalTasksCount = participant.tasks.length;
        
        if (filterType === 'complete') {
          return matchesSearch && completedTasksCount === totalTasksCount;
        }
        
        return matchesSearch && completedTasksCount < totalTasksCount;
      })
      .sort((a, b) => {
        // First, separate seated and unseated participants
        if (a.seatedAt && !b.seatedAt) return 1;  // a goes to bottom
        if (!a.seatedAt && b.seatedAt) return -1; // b goes to bottom
        
        // If both are seated or both are unseated, sort by the selected criteria
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'tokens':
            return b.totalTokens - a.totalTokens;
          default:
            // For position sorting, maintain order within seated and unseated groups
            if (a.seatedAt && b.seatedAt) {
              // For seated participants, sort by seating time
              return new Date(a.seatedAt).getTime() - new Date(b.seatedAt).getTime();
            }
            // For unseated participants, sort by position
            return a.position - b.position;
        }
      });
  }, [participants, searchQuery, filterType, sortBy]);

  const capitalizeFirstLetter = (string: string) => {
    return string.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only capitalize if there's actual content
    setNewParticipantName(value ? capitalizeFirstLetter(value) : value);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newParticipantName.trim()) {
      addParticipant();
    }
  };

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const participantId = Date.now().toString();
    
    const initialTasks: Task[] = [
      ...PRIMARY_TASKS.map(task => ({
        ...task,
        id: `${participantId}-${Math.random()}`,
        completed: false
      })),
      ...SECONDARY_TASKS.map(task => ({
        ...task,
        id: `${participantId}-${Math.random()}`,
        completed: false
      }))
    ];

    const newParticipant: Participant = {
      id: participantId,
      name: capitalizeFirstLetter(newParticipantName.trim()),
      position: participants.length + 1,
      tasks: initialTasks,
      totalTokens: 0,
      checkedIn: false,
      seatedAt: null
    };

    const updatedParticipants = [...participants, newParticipant];
    updateParticipants(updatedParticipants);
    setNewParticipantName('');
    // Ensure all cards are collapsed after adding a new participant
    setCollapsedCards(new Set(updatedParticipants.map(p => p.id)));
  };

  const assignSeat = (participantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newParticipants = participants.map(participant => {
      if (participant.id === participantId) {
        return {
          ...participant,
          seatedAt: new Date() // Keep as Date object
        };
      }
      return participant;
    });
    
    // Reorder positions for remaining waitlist participants
    const waitingParticipants = newParticipants.filter(p => !p.seatedAt);
    waitingParticipants.forEach((p, index) => {
      const participantToUpdate = newParticipants.find(np => np.id === p.id);
      if (participantToUpdate) {
        participantToUpdate.position = index + 1;
      }
    });
    
    updateParticipants(newParticipants);
  };

  const returnToWaitlist = (participantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get the highest position number among waiting participants
    const maxPosition = participants
      .filter(p => !p.seatedAt)
      .reduce((max, p) => Math.max(max, p.position), 0);

    const newParticipants = participants.map(participant => {
      if (participant.id === participantId) {
        return {
          ...participant,
          seatedAt: null,
          position: maxPosition + 1 // Assign the next available position
        };
      }
      return participant;
    });
    
    updateParticipants(newParticipants);
  };

  const toggleTask = (participantId: string, taskId: string) => {
    const newParticipants = participants.map(participant => {
      if (participant.id === participantId) {
        const updatedTasks = participant.tasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        
        // Recalculate total tokens
        const totalTokens = updatedTasks.reduce((sum, task) => 
          task.completed ? sum + task.tokenReward : sum, 0
        );

        return {
          ...participant,
          tasks: updatedTasks,
          totalTokens
        };
      }
      return participant;
    });

    updateParticipants(newParticipants);
  };

  const toggleCardCollapse = (participantId: string) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const removeParticipant = (participantId: string) => {
    const newParticipants = participants.filter(p => p.id !== participantId);
    updateParticipants(newParticipants);
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(participantId);
      return newSet;
    });
  };

  const handleDeleteClick = (participantId: string, participantName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({ id: participantId, name: participantName });
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      removeParticipant(deleteConfirmation.id);
      setDeleteConfirmation(null);
    }
  };

  const toggleCheckIn = (participantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newParticipants = participants.map(participant => {
      if (participant.id === participantId) {
        return {
          ...participant,
          checkedIn: !participant.checkedIn
        };
      }
      return participant;
    });
    updateParticipants(newParticipants);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, participantId: string) => {
    setDraggedParticipant(participantId);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedParticipant(null);
    setDragOverParticipant(null);
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, participantId: string) => {
    e.preventDefault();
    setDragOverParticipant(participantId);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedParticipant || draggedParticipant === targetId) return;

    const newParticipants = [...participants];
    
    // Get source and target participants
    const sourceParticipant = newParticipants.find(p => p.id === draggedParticipant);
    const targetParticipant = newParticipants.find(p => p.id === targetId);
    
    if (!sourceParticipant || !targetParticipant || sourceParticipant.seatedAt || targetParticipant.seatedAt) {
      return;
    }

    // Get all unseated participants in current order
    const unseatedParticipants = newParticipants
      .filter(p => !p.seatedAt)
      .sort((a, b) => a.position - b.position);

    // Remove source participant from array
    const sourceIndex = unseatedParticipants.findIndex(p => p.id === draggedParticipant);
    const [movedParticipant] = unseatedParticipants.splice(sourceIndex, 1);
    
    // Insert at target position
    const targetIndex = unseatedParticipants.findIndex(p => p.id === targetId);
    unseatedParticipants.splice(targetIndex, 0, movedParticipant);

    // Update all positions
    unseatedParticipants.forEach((participant, index) => {
      const participantToUpdate = newParticipants.find(p => p.id === participant.id);
      if (participantToUpdate) {
        participantToUpdate.position = index + 1;
      }
    });

    updateParticipants(newParticipants);
    setDraggedParticipant(null);
    setDragOverParticipant(null);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-8 flex gap-8">
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div 
          className="fixed z-50 bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-xl p-4 w-72"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex items-start mb-3">
            <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold mb-1">Delete {deleteConfirmation.name}?</h3>
              <p className="text-xs text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirmation(null)}
              className="px-3 py-1 text-sm rounded bg-[#363636] text-gray-300 hover:bg-[#404040] transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Waitlist Admin Dashboard</h1>
          <button
            onClick={openDisplayWindow}
            className="bg-[#4169e1] text-white px-6 py-3 rounded-lg hover:bg-[#3154b3] transition-all duration-200 flex items-center gap-2"
          >
            <span>Launch Display</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5z" />
            </svg>
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participants..."
                className="w-full bg-[#2d2d2d] text-white border border-[#404040] p-3 rounded-lg focus:outline-none focus:border-[#4169e1]"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'incomplete' | 'complete')}
              className="bg-[#2d2d2d] text-white border border-[#404040] p-3 pr-10 rounded-lg focus:outline-none focus:border-[#4169e1] appearance-none relative"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem'
              }}
            >
              <option value="all">All Participants</option>
              <option value="incomplete">Incomplete Tasks</option>
              <option value="complete">Completed All Tasks</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'position' | 'name' | 'tokens')}
              className="bg-[#2d2d2d] text-white border border-[#404040] p-3 pr-10 rounded-lg focus:outline-none focus:border-[#4169e1] appearance-none relative"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.25rem'
              }}
            >
              <option value="position">Sort by Position</option>
              <option value="name">Sort by Name</option>
              <option value="tokens">Sort by Tokens</option>
            </select>
          </div>

          <div className="flex gap-4 items-center bg-[#2d2d2d] p-4 rounded-lg">
            <input
              type="text"
              value={newParticipantName}
              onChange={handleNameChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter participant name"
              className="flex-1 bg-[#363636] text-white border border-[#404040] p-2 rounded-lg focus:outline-none focus:border-[#4169e1]"
            />
            <button
              onClick={addParticipant}
              disabled={!newParticipantName.trim()}
              className="bg-[#4169e1] text-white px-6 py-2 rounded-lg hover:bg-[#3154b3] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Participant
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#2d2d2d] p-4 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-1">Total Participants</h3>
            <p className="text-2xl font-bold">{participants.length}</p>
          </div>
          <div className="bg-[#2d2d2d] p-4 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-1">Completed All Tasks</h3>
            <p className="text-2xl font-bold">
              {participants.filter(p => p.tasks.every(t => t.completed)).length}
            </p>
          </div>
          <div className="bg-[#2d2d2d] p-4 rounded-lg">
            <h3 className="text-sm text-gray-400 mb-1">Total Tokens Awarded</h3>
            <p className="text-2xl font-bold text-[#4169e1]">
              {participants.reduce((sum, p) => sum + p.totalTokens, 0)}
            </p>
          </div>
        </div>

        {/* Participants List */}
        <div className="space-y-6">
          {filteredParticipants.map(participant => (
            <div 
              key={participant.id} 
              className={`bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-lg overflow-hidden cursor-pointer ${
                participant.seatedAt ? 'opacity-75' : ''
              } ${dragOverParticipant === participant.id ? 'border-[#12C4E7] border-2' : ''}`}
              onClick={() => toggleCardCollapse(participant.id)}
              draggable={!participant.seatedAt}
              onDragStart={(e) => handleDragStart(e, participant.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, participant.id)}
              onDrop={(e) => handleDrop(e, participant.id)}
            >
              <div className="flex items-center p-6">
                <div className="flex items-center gap-4 flex-1">
                  {!participant.seatedAt && (
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400 hover:text-white transition-colors duration-200">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                        </svg>
                      </div>
                      <span className="bg-[#4169e1] text-white w-8 h-8 rounded-full flex items-center justify-center">
                        {participant.position}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{participant.name}</h3>
                    {participant.checkedIn && (
                      <span className="text-green-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    {participant.seatedAt && (
                      <span className="text-[#12C4E7] text-sm ml-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Seated at {new Date(participant.seatedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <span className="bg-[#363636] text-[#4169e1] px-3 py-1 rounded-full text-sm">
                    {participant.totalTokens} tokens
                  </span>
                </div>
                
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => toggleCheckIn(participant.id, e)}
                    className={`px-3 py-1 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      participant.checkedIn 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-[#363636] text-gray-400 hover:bg-[#404040] hover:text-white'
                    }`}
                  >
                    <span>{participant.checkedIn ? 'Checked In' : 'Check In'}</span>
                    {participant.checkedIn && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  {!participant.seatedAt ? (
                    <button
                      onClick={(e) => assignSeat(participant.id, e)}
                      className="px-3 py-1 rounded-lg bg-[#4169e1] text-white hover:bg-[#0EA5C6] transition-all duration-200"
                    >
                      Assign Seat
                    </button>
                  ) : (
                    <button
                      onClick={(e) => returnToWaitlist(participant.id, e)}
                      className="px-3 py-1 rounded-lg bg-[#363636] text-[#4169e1] hover:bg-[#404040] transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Return to Waitlist</span>
                    </button>
                  )}
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => handleDeleteClick(participant.id, participant.name, e)}
                      className="bg-[#363636] text-gray-400 w-10 h-10 rounded-lg hover:bg-[#404040] hover:text-white transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardCollapse(participant.id);
                      }}
                      className="bg-[#363636] text-gray-400 w-10 h-10 rounded-lg hover:bg-[#404040] hover:text-white transition-all duration-200 flex items-center justify-center"
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform duration-200 ${
                          !collapsedCards.has(participant.id) ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Collapsible Content */}
              <div 
                className={`grid grid-cols-2 gap-4 p-6 pt-0 transition-all duration-300 ${
                  collapsedCards.has(participant.id) ? 'hidden' : ''
                }`}
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-[#4169e1]">500 Token Tasks</h4>
                  <div className="space-y-2">
                    {participant.tasks
                      .filter(task => task.type === 'primary')
                      .map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center bg-[#363636] p-3 rounded-lg group cursor-pointer"
                          onClick={() => toggleTask(participant.id, task.id)}
                        >
                          <div 
                            className="relative w-5 h-5 mr-3 rounded border-[#4169e1] border-opacity-0 group-hover:border-opacity-100 bg-[#2d2d2d] transition-all duration-200 flex items-center justify-center"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(participant.id, task.id)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            {task.completed && (
                              <svg 
                                className="w-4 h-4 text-[#4169e1]" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                            )}
                          </div>
                          <span className={task.completed ? 'line-through text-gray-400' : 'group-hover:text-white transition-colors duration-200'}>
                            {task.description}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-[#4169e1]">300 Token Tasks</h4>
                  <div className="space-y-2">
                    {participant.tasks
                      .filter(task => task.type === 'secondary')
                      .map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center bg-[#363636] p-3 rounded-lg group cursor-pointer"
                          onClick={() => toggleTask(participant.id, task.id)}
                        >
                          <div 
                            className="relative w-5 h-5 mr-3 rounded border-[#4169e1] border-opacity-0 group-hover:border-opacity-100 bg-[#2d2d2d] transition-all duration-200 flex items-center justify-center"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(participant.id, task.id)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            {task.completed && (
                              <svg 
                                className="w-4 h-4 text-[#4169e1]" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                            )}
                          </div>
                          <span className={task.completed ? 'line-through text-gray-400' : 'group-hover:text-white transition-colors duration-200'}>
                            {task.description}
                          </span>
                        </div>
                      ))}
                  </div>
                  
                  {/* Custom Token Input Field */}
                  <div className="pt-3">
                    <div 
                      className="bg-[#363636] p-4 rounded-lg"
                      onClick={e => e.stopPropagation()}
                    >
                      <label className="block text-sm text-gray-400 mb-2">
                        Add tokens for custom/random missions
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="Token amount"
                          className="flex-1 bg-[#2d2d2d] text-white border border-[#404040] p-2 rounded-lg focus:outline-none focus:border-[#4169e1]"
                          defaultValue={participant.customTokens || ""}
                          onChange={(e) => {
                            e.stopPropagation();
                            // Store temporarily without saving
                            const elem = e.target as HTMLInputElement;
                            elem.dataset.pendingValue = elem.value;
                          }}
                        />
                        <button
                          className="bg-[#4169e1] text-white px-4 py-2 rounded-lg hover:bg-[#3154b3] transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            const tokenValue = parseInt(input.value) || 0;
                            
                            // Get current custom tokens or default to 0
                            const currentCustomTokens = participant.customTokens || 0;
                            
                            // Only update if value has changed
                            if (tokenValue !== currentCustomTokens) {
                              const newParticipants = participants.map(p => {
                                if (p.id === participant.id) {
                                  // Calculate the difference to add to the total
                                  const tokenDifference = tokenValue - (p.customTokens || 0);
                                  
                                  return {
                                    ...p,
                                    customTokens: tokenValue,
                                    totalTokens: p.totalTokens + tokenDifference
                                  };
                                }
                                return p;
                              });
                              
                              updateParticipants(newParticipants);
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredParticipants.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-xl">No participants found</p>
              <p className="text-sm mt-2">Try adjusting your search or filter settings</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Side Panel */}
      <div className="w-[480px] sticky top-8 h-[calc(100vh-4rem)]">
        <Leaderboard participants={participants} />
      </div>
    </div>
  );
} 