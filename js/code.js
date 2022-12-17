import { w2sidebar } from 'js/w2ui.js'

new w2sidebar({
    box: '#sidebar',
    name: 'sidebar',
    nodes: [
        { id: 'level-1', text: 'Level 1', expanded: true, group: true,
            nodes: [
                { id: 'level-1-1', text: 'Level 1.1', icon: 'fa fa-home' },
                { id: 'level-1-2', text: 'Level 1.2', icon: 'fa fa-star' },
                { id: 'level-1-3', text: 'Level 1.3', icon: 'fa fa-star-o' }
            ]
        },
        { id: 'level-2', text: 'Level 2', expanded: true, group: true,
            nodes: [
                { id: 'level-2-1', text: 'Level 2.1', icon: 'fa fa-star', count: 3,
                    nodes: [
                        { id: 'level-2-1-1', text: 'Level 2.1.1', icon: 'fa fa-star-o' },
                        { id: 'level-2-1-2', text: 'Level 2.1.2', icon: 'fa fa-star-o', count: 67 },
                        { id: 'level-2-1-3', text: 'Level 2.1.3', icon: 'fa fa-star-o' }
                    ]},
                { id: 'level-2-2', text: 'Level 2.2', icon: 'fa fa-star-o' },
                { id: 'level-2-3', text: 'Level 2.3', icon: 'fa fa-star-o' }
            ]
        }
    ]
})