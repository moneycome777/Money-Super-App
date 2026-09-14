const fs = require('fs');
let data = fs.readFileSync('src/store/useStore.ts', 'utf8');

const target = `      fetchWealthConfigs: async () => {`;
const replacement = `      fetchPetHealth: async () => {
        if (get().hasFetchedPetHealth) return;
        const pin = get().appPin;
        if (!pin) return;
        
        try {
          const response = await fetch('/api/pet-health', {
            headers: { 'x-app-pin': pin }
          });
          
          if (response.ok) {
            const data = await response.json();
            set({ petHealth: data, hasFetchedPetHealth: true });
          }
        } catch (error) {
          console.error("Failed to fetch pet health:", error);
        }
      },

      updatePetHealth: async (rowIndex: number, lastConsumed: string) => {
        const pin = get().appPin;
        if (!pin) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch(\`/api/pet-health/\${rowIndex}\`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'x-app-pin': pin 
            },
            body: JSON.stringify({ lastConsumed })
          });
          
          if (response.ok) {
            set((state) => ({
              petHealth: state.petHealth.map(item => 
                item.rowIndex === rowIndex ? { ...item, lastConsumed } : item
              )
            }));
          }
        } catch (error) {
          console.error("Failed to update pet health:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchWealthConfigs: async () => {`;

data = data.replace(target, replacement);

fs.writeFileSync('src/store/useStore.ts', data);
