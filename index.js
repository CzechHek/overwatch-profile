const { Plugin } = require('powercord/entities')
const { TabBar } = require('powercord/components')

const { React, getModule, getModuleByDisplayName } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')
const { get } = require('powercord/http')

const Profile = require('./components/Profile')

module.exports = class OverwatchProfile extends Plugin {
    constructor () {
        super();
        this.ConnectedProfile = this.settings.connectStore(Profile);
    }

    async startPlugin() {
        const _this = this

        const { tabBarItem } = await getModule(['tabBarItem']);
        
        const UserProfileBody = await this._getUserProfileBody()

        this.loadStylesheet('style.css');

        inject('user-profile-load', UserProfileBody.prototype, 'componentDidUpdate', async function (_, res) {
            const { user, connectedAccounts } = this.props;
           
            if (!user || user.bot) return;
      
            
            try {
                if (connectedAccounts) {
                    const account = connectedAccounts.find(a => {
                        return a.type === "battlenet";
                    });

                    
                    if (account) {
                        const stats = await _this.fetchStats(account.name);
                        this.setState({ _stats: stats });
                    }     
                }
            } catch (e) {
                console.log(e)
            }
            
        })

        inject('user-profile-tab-bar', UserProfileBody.prototype, 'renderTabBar', function (_, res) {
            const { user } = this.props;
    
            if (!res || !user || user.bot || !this.state._stats) return res;
    
            const statsTab = React.createElement(TabBar.Item, {
                key: 'OVERWATCH_STATS',
                className: tabBarItem,
                id: 'OVERWATCH_STATS'
            }, 'Overwatch Profile');
    
            res.props.children.props.children.push(statsTab);
    
            return res;
        })

        inject('user-profile-body', UserProfileBody.prototype, 'render', function (_, res) {
            const { children } = res.props;
            const { section } = this.props;
      
            if (section !== 'OVERWATCH_STATS') return res;
      
            const body = children.props.children[1];
            body.props.children = [];
      
            body.props.children.push(React.createElement(_this.ConnectedProfile, { stats: this.state._stats }));
      
            return res;
        });
    }

    pluginWillUnload() {
        uninject('user-profile-tab-bar');
        uninject('user-profile-body');
        uninject('user-profile-update');

        /*
        uninject('test-profile-render')
        uninject('test-profile-info-render')
        uninject('test-user-tab-bar')
        uninject('test-user-body')
        uninject('test-user-load')

        uninject('test-profile-mount')
        uninject('test-profile-update')
        */
    }

    async fetchStats(battleTag) {
        return await get(`https://ow-api.com/v1/stats/pc/eu/${battleTag.replace('#', '-')}/complete`)
          .then(r => r.body);
    }

    async _getUserProfileBody () {
        const UserProfile = await getModuleByDisplayName('UserProfile')
        const VeryDecoratedUserProfileBody = UserProfile.prototype.render().type
        const DecoratedUserProfileBody = this._extractFromFlux(VeryDecoratedUserProfileBody).render().type
        return DecoratedUserProfileBody.prototype.render.call({ props: { forwardedRef: null } }).type
    }

    _extractFromFlux (FluxContainer) {
        return FluxContainer.prototype.render.call({ memoizedGetStateFromStores: () => null }).type
    }
}